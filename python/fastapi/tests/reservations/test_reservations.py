import sqlite3
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from threading import Barrier

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

    with TestClient(
        app, raise_server_exceptions=False, headers={"Idempotency-Key": "test-key"}
    ) as test_client:
        assert test_client.portal is not None
        test_client.portal.call(seed)
        yield test_client


def test_sequential_reservation_and_sold_out(
    client: TestClient, database_url: str
) -> None:
    first = client.post("/v1/reservations", json={"product_id": "demo"})
    assert first.status_code == 201
    assert first.json()["data"]["product_id"] == "demo"
    second = client.post(
        "/v1/reservations",
        json={"product_id": "demo"},
        headers={"Idempotency-Key": "second-key"},
    )
    assert second.status_code == 409
    assert second.json()["code"] == "SOLD_OUT"
    assert database_state(database_url) == (0, 1, 1)


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


@pytest.mark.parametrize("requests", [2, 12])
def test_concurrent_requests_across_apps(
    client: TestClient, database_url: str, requests: int
) -> None:
    other_app = create_app(Settings(db_primary_url=database_url))
    barrier = Barrier(requests)
    with (
        TestClient(other_app) as other,
        ThreadPoolExecutor(max_workers=requests) as executor,
    ):

        def call(index: int):
            barrier.wait(timeout=5)
            return (client if index % 2 else other).post(
                "/v1/reservations",
                json={"product_id": "demo"},
                headers={"Idempotency-Key": f"race-{index}"},
            )

        results = list(executor.map(call, range(requests)))
    assert [r.status_code for r in results].count(201) == 1
    assert [r.status_code for r in results].count(409) == requests - 1
    assert all(r.status_code == 201 or r.json()["code"] == "SOLD_OUT" for r in results)
    assert database_state(database_url) == (0, 1, 1)


def test_lock_timeout_is_retryable_not_sold_out(
    client: TestClient, database_url: str
) -> None:
    app = create_app(
        Settings(db_primary_url=database_url, db_sqlite_busy_timeout_seconds=0.02)
    )
    with (
        TestClient(app, headers={"Idempotency-Key": "retry-key"}) as api,
        closing(sqlite3.connect(str(make_url(database_url).database))) as locked,
    ):
        locked.execute("BEGIN IMMEDIATE")
        try:
            response = api.post("/v1/reservations", json={"product_id": "demo"})
            assert response.status_code == 503
            assert response.json()["code"] == "DATABASE_BUSY"
            assert response.headers["Retry-After"] == "1"
            assert database_state(database_url) == (1, 0, 0)
        finally:
            locked.rollback()
        assert (
            api.post("/v1/reservations", json={"product_id": "demo"}).status_code == 201
        )


def test_pool_timeout_is_retryable(client: TestClient, database_url: str) -> None:
    app = create_app(
        Settings(
            db_primary_url=database_url, db_pool_size=1, db_pool_timeout_seconds=0.02
        )
    )

    async def occupy():
        return await app.state.primary_engine.connect()

    with TestClient(app, headers={"Idempotency-Key": "retry-key"}) as api:
        assert api.portal is not None
        connection = api.portal.call(occupy)
        try:
            response = api.post("/v1/reservations", json={"product_id": "demo"})
            assert response.status_code == 503
            assert response.json()["code"] == "DATABASE_POOL_TIMEOUT"
            assert database_state(database_url) == (1, 0, 0)
        finally:
            api.portal.call(connection.close)
        assert (
            api.post("/v1/reservations", json={"product_id": "demo"}).status_code == 201
        )


def test_replay_and_conflicting_input(client: TestClient, database_url: str) -> None:
    first = client.post("/v1/reservations", json={"product_id": "demo"})
    replay = client.post("/v1/reservations", json={"product_id": "demo"})
    assert first.status_code == replay.status_code == 201
    assert first.content == replay.content
    assert first.headers["Idempotency-Replayed"] == "false"
    assert replay.headers["Idempotency-Replayed"] == "true"
    conflict = client.post("/v1/reservations", json={"product_id": "other"})
    assert conflict.status_code == 409
    assert conflict.json()["code"] == "IDEMPOTENCY_CONFLICT"
    assert database_state(database_url) == (0, 1, 1)


def test_idempotency_save_failure_and_retry(
    client: TestClient, database_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    import template_api.services.reservations as service

    original = service.save_idempotency

    async def fail(session, key, reservation):
        await original(session, key, reservation)
        raise RuntimeError("after key save")

    monkeypatch.setattr(service, "save_idempotency", fail)
    assert (
        client.post("/v1/reservations", json={"product_id": "demo"}).status_code == 500
    )
    assert database_state(database_url) == (1, 0, 0)
    monkeypatch.setattr(service, "save_idempotency", original)
    assert (
        client.post("/v1/reservations", json={"product_id": "demo"}).status_code == 201
    )
    assert database_state(database_url) == (0, 1, 1)


def test_idempotency_header_validation(client: TestClient, database_url: str) -> None:
    for key in ("", "a" * 129, "invalid spaces"):
        assert (
            client.post(
                "/v1/reservations",
                json={"product_id": "demo"},
                headers={"Idempotency-Key": key},
            ).status_code
            == 422
        )
    del client.headers["Idempotency-Key"]
    assert (
        client.post("/v1/reservations", json={"product_id": "demo"}).status_code == 422
    )
    assert database_state(database_url) == (1, 0, 0)
