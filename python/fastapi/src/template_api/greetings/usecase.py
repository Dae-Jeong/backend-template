from template_api.core.contracts import Clock
from template_api.greetings.contracts import Greeting


def make_greeting(*, name: str, clock: Clock) -> Greeting:
    return Greeting(message=f"Hello, {name}!", generated_at=clock())
