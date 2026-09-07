from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import StringConstraints

from template_api.dependencies import ClockDep
from template_api.greetings.usecase import Greeting, make_greeting

router = APIRouter(prefix="/v1/greetings", tags=["greetings"])

Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80), Query()
]


@router.get("", response_model=Greeting)
def greeting(name: Name, clock: ClockDep) -> Greeting:
    return make_greeting(name=name, clock=clock)
