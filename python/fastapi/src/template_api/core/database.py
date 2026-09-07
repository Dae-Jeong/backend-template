from time import monotonic
from typing import Any, cast

from sqlalchemy import Connection, event
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.pool import ConnectionPoolEntry

from template_api.core.database_metrics import DatabaseMetrics
from template_api.core.settings import Settings


def create_primary_engine(settings: Settings, metrics: DatabaseMetrics) -> AsyncEngine:
    engine = create_async_engine(
        settings.db_primary_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_pool_max_overflow,
        pool_timeout=settings.db_pool_timeout_seconds,
        connect_args={"timeout": settings.db_sqlite_busy_timeout_seconds},
        hide_parameters=True,
    )

    # aiosqlite adapter supports these synchronous event hooks.
    @event.listens_for(engine.sync_engine, "connect")
    def configure_sqlite(connection: Any, record: ConnectionPoolEntry) -> None:
        connection.isolation_level = None
        cursor = connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        finally:
            cursor.close()

    @event.listens_for(engine.sync_engine, "begin")
    def begin(connection: Connection) -> None:
        connection.exec_driver_sql("BEGIN")

    @event.listens_for(engine.sync_engine, "checkout")
    def checkout(connection: Any, record: ConnectionPoolEntry, proxy: Any) -> None:
        cast(dict[str, Any], record.record_info)["checkout_started"] = monotonic()
        metrics.record(metrics.connections.inc)

    @event.listens_for(engine.sync_engine, "checkin")
    @event.listens_for(engine.sync_engine, "detach")
    def returned(connection: Any, record: ConnectionPoolEntry) -> None:
        started = cast(dict[str, Any], record.record_info).pop("checkout_started", None)
        if started is not None:
            metrics.record(metrics.connections.dec)
            metrics.record(lambda: metrics.hold.observe(monotonic() - started))

    return engine
