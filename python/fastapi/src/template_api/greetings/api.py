from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import StringConstraints

from template_api.dependencies import ClockDep
from template_api.errors import PROBLEM_RESPONSES
from template_api.greetings.schemas import GreetingData
from template_api.greetings.usecase import make_greeting
from template_api.schemas import Success

router = APIRouter(prefix="/v1/greetings", tags=["greetings"])

Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80), Query()
]


@router.get("", response_model=Success[GreetingData], responses=PROBLEM_RESPONSES)
def greeting(name: Name, clock: ClockDep) -> Success[GreetingData]:
    result = make_greeting(name=name, clock=clock)
    return Success(
        data=GreetingData(message=result.message, generated_at=result.generated_at)
    )
