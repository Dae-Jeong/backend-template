from collections.abc import Callable
from datetime import UTC, datetime

type Clock = Callable[[], datetime]


def system_clock() -> datetime:
    return datetime.now(UTC)
