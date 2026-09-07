import sqlite3
from collections.abc import Iterator
from contextlib import closing

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert
from sqlalchemy.engine import make_url

from template_api.bootstrap.app import create_app
from template_api.core.settings import Settings
from template_api.models.reservations import products


def database_state(url: str) -> tuple[int, int, int]:
    with closing(sqlite3.connect(str(make_url(url).database))) as connection:
        return (
            connection.execute(
                "SELECT available FROM products WHERE id='demo'"
            ).fetchone()[0],
            connection.execute("SELECT count(*) FROM reservations").fetchone()[0],
            connection.execute("SELECT count(*) FROM idempotency_keys").fetchone()[0],
        )


@pytest.fixture
def client(database_url: str) -> Iterator[TestClient]:
    app = create_app(Settings(db_primary_url=database_url))

    async def seed():
        async with app.state.primary_engine.begin() as connection:
            await connection.execute(
                insert(products),
                [{"id": "demo", "available": 1}, {"id": "other", "available": 1}],
            )

    with TestClient(app, raise_server_exceptions=False) as test_client:
        assert test_client.portal is not None
        test_client.portal.call(seed)
        yield test_client


def test_sequential_reservation_and_sold_out(
    client: TestClient, database_url: str
) -> None:
    first = client.post("/v1/reservations", json={"product_id": "demo"})
    assert first.status_code == 201
    assert first.json()["data"]["product_id"] == "demo"
    second = client.post("/v1/reservations", json={"product_id": "demo"})
    assert second.status_code == 409
    assert second.json()["code"] == "SOLD_OUT"
    assert database_state(database_url) == (0, 1, 0)


def test_validation_and_missing_product(client: TestClient) -> None:
    for body in (
        {},
        {"product_id": ""},
        {"product_id": "demo", "quantity": 2},
        {"product_id": 3},
    ):
        assert client.post("/v1/reservations", json=body).status_code == 422
    response = client.post("/v1/reservations", json={"product_id": "missing"})
    assert response.status_code == 404
    assert response.json()["code"] == "PRODUCT_NOT_FOUND"
    schema = client.get("/openapi.json").json()
    responses = schema["paths"]["/v1/reservations"]["post"]["responses"]
    for code in (404, 409, 422, 500, 503):
        assert "application/problem+json" in responses[str(code)]["content"]


def test_save_failure_rolls_back_stock(
    client: TestClient, database_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    import template_api.services.reservations as service

    original = service.save_reservation

    async def fail(session, reservation):
        await original(session, reservation)
        raise RuntimeError("synthetic-private-error")

    monkeypatch.setattr(service, "save_reservation", fail)
    response = client.post("/v1/reservations", json={"product_id": "demo"})
    assert response.status_code == 500
    assert "synthetic-private-error" not in response.text
    assert database_state(database_url) == (1, 0, 0)
    metrics = client.get("/metrics").text
    assert 'db_transactions_total{outcome="rolled_back",role="primary"} 1.0' in metrics
