from dataclasses import dataclass

from prometheus_client import CollectorRegistry, Counter, Histogram


@dataclass
class HttpMetrics:
    registry: CollectorRegistry
    requests: Counter
    duration: Histogram
    failed: bool = False


def create_metrics() -> HttpMetrics:
    registry = CollectorRegistry()
    labels = ("method", "route", "status", "completion", "execution")
    return HttpMetrics(
        registry=registry,
        requests=Counter(
            "http_requests_total",
            "HTTP requests by observed outcome.",
            labels,
            registry=registry,
        ),
        duration=Histogram(
            "http_request_duration_seconds",
            "Time to final response body send, or incomplete execution exit.",
            labels,
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5),
            registry=registry,
        ),
    )
