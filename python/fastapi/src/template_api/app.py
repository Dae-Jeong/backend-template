from fastapi import FastAPI

from template_api.settings import Settings


def index() -> dict[str, str]:
    return {"message": "Hello, FastAPI!"}


def create_app(settings: Settings) -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.service_version)
    app.get("/")(index)
    return app
