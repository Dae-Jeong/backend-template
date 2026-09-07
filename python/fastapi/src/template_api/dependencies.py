from typing import Annotated, cast

from fastapi import Depends, Request

from template_api.core.clock import Clock


def get_clock(request: Request) -> Clock:
    return cast(Clock, request.app.state.clock)


ClockDep = Annotated[Clock, Depends(get_clock)]
