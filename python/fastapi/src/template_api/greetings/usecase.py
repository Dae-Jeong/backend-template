from dataclasses import dataclass
from datetime import datetime

from template_api.clock import Clock


@dataclass(frozen=True)
class Greeting:
    message: str
    generated_at: datetime


def make_greeting(*, name: str, clock: Clock) -> Greeting:
    return Greeting(message=f"Hello, {name}!", generated_at=clock())
