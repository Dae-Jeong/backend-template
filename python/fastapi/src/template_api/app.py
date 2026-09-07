from fastapi import FastAPI

from template_api.contracts import PrepareResources
from template_api.core.clock import system_clock
from template_api.core.contracts import Clock
from template_api.core.lifespan import (
    create_lifespan,
    prepare_resources,
)
from template_api.core.settings import Settings
from template_api.greetings.api import router as greetings_router
from template_api.health import router as health_router


def index() -> dict[str, str]:
    return {"message": "Hello, FastAPI!"}


def create_app(
    settings: Settings,
    *,
    clock: Clock = system_clock,
    prepare: PrepareResources = prepare_resources,
) -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.service_version,
        lifespan=create_lifespan(prepare),
    )
    app.state.clock = clock
    app.state.ready = False
    app.get("/")(index)
    app.include_router(greetings_router)
    app.include_router(health_router)
    return app
