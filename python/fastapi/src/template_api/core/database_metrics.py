from collections.abc import Callable
from dataclasses import dataclass

from prometheus_client import Gauge, Histogram

from template_api.core.metrics import HttpMetrics


@dataclass
class DatabaseMetrics:
    owner: HttpMetrics
    connections: Gauge
    hold: Histogram

    def record(self, action: Callable[[], None]) -> None:
        try:
            action()
        except Exception:
            self.owner.failed = True


def create_database_metrics(owner: HttpMetrics, limit: int) -> DatabaseMetrics:
    labels = {"role": "primary"}
    connections = Gauge(
        "db_pool_connections_in_use",
        "Connections currently checked out.",
        labels,
        registry=owner.registry,
    ).labels(**labels)
    hold = Histogram(
        "db_pool_connection_hold_seconds",
        "Time from checkout to return or detach.",
        labels,
        registry=owner.registry,
    ).labels(**labels)
    Gauge(
        "db_pool_connection_limit",
        "Configured pool size plus allowed overflow.",
        labels,
        registry=owner.registry,
    ).labels(**labels).set(limit)
    return DatabaseMetrics(owner, connections, hold)
