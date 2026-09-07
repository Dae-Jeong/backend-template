from fastapi import FastAPI

from template_api.core.clock import Clock, system_clock
from template_api.core.settings import Settings
from template_api.greetings.api import router as greetings_router


def index() -> dict[str, str]:
    return {"message": "Hello, FastAPI!"}


def create_app(settings: Settings, *, clock: Clock = system_clock) -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.service_version)
    app.state.clock = clock
    app.get("/")(index)
    app.include_router(greetings_router)
    return app
