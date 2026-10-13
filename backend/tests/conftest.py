"""Test fixtures.

Tests run against a dedicated PostgreSQL database (`<DATABASE_URL db>_test`, created on demand,
or `TEST_DATABASE_URL` if set). Each test runs inside a transaction that is rolled back
afterwards; the services' `commit()` calls only release a SAVEPOINT, so tests stay isolated.
"""

import os
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app


def _test_database_url() -> str:
    if url := os.environ.get("TEST_DATABASE_URL"):
        return url
    main = make_url(get_settings().database_url)
    return main.set(database=f"{main.database}_test").render_as_string(hide_password=False)


def _ensure_database_exists(url: str) -> None:
    target = make_url(url)
    admin = create_engine(target.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": target.database}
        )
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{target.database}"'))
    admin.dispose()


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    url = _test_database_url()
    _ensure_database_exists(url)
    engine = create_engine(url, connect_args={"options": "-c timezone=utc"})
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
        autoflush=False,
        expire_on_commit=False,
    )
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def create_lead(client: TestClient) -> Callable[..., dict[str, Any]]:
    """Create a lead through the API and return its JSON representation."""

    def _create(name: str = "Sarah Connor", **fields: Any) -> dict[str, Any]:
        response = client.post("/api/v1/leads", json={"name": name, **fields})
        assert response.status_code == 201, response.text
        lead: dict[str, Any] = response.json()
        return lead

    return _create
