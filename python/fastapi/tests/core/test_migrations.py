import asyncio
import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import insert, text
from sqlalchemy.exc import IntegrityError

from template_api.core.database import create_primary_engine
from template_api.core.database_metrics import create_database_metrics
from template_api.core.metrics import create_metrics
from template_api.core.settings import Settings
from template_api.models.reservations import idempotency_keys, products, reservations


def test_migration_repeat_drift_and_database_constraints(database_url: str) -> None:
    config = Path(__file__).resolve().parents[2] / "alembic.ini"
    for args in [("upgrade", "head"), ("check",)]:
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "-c", str(config), *args],
            env={**os.environ, "DB_PRIMARY_URL": database_url},
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, result.stderr + result.stdout

    async def scenario():
        engine = create_primary_engine(
            Settings(db_primary_url=database_url),
            create_database_metrics(create_metrics(), 4),
        )
        try:
            async with engine.begin() as conn:
                await conn.execute(insert(products).values(id="demo", available=1))
                await conn.execute(
                    insert(reservations).values(
                        id="r",
                        product_id="demo",
                        created_at="2026-09-08T00:00:00+00:00",
                    )
                )
                await conn.execute(
                    insert(idempotency_keys).values(
                        key="key",
                        product_id="demo",
                        reservation_id="r",
                        response={"reservation_id": "r"},
                    )
                )
            invalid = [
                insert(products).values(id="bad", available=-1),
                insert(reservations).values(
                    id="invalid", product_id="missing", created_at="now"
                ),
                insert(idempotency_keys).values(
                    key="key", product_id="demo", reservation_id="r", response={}
                ),
            ]
            for statement in invalid:
                with pytest.raises(IntegrityError):
                    async with engine.begin() as conn:
                        await conn.execute(statement)
            async with engine.connect() as conn:
                assert await conn.scalar(text("SELECT count(*) FROM reservations")) == 1
        finally:
            await engine.dispose()

    asyncio.run(scenario())
