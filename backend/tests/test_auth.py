from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token
from app.models import User
from tests.conftest import TEST_PASSWORD

LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"
COOKIE = get_settings().auth_cookie_name


class TestLogin:
    def test_sets_httponly_session_cookie_and_returns_token(
        self, anon_client: TestClient, user: User
    ) -> None:
        response = anon_client.post(LOGIN, json={"email": user.email, "password": TEST_PASSWORD})

        assert response.status_code == 200
        body = response.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"]
        assert body["user"] == {"id": user.id, "email": "rep@leadflow.dev", "name": "Test Rep"}
        set_cookie = response.headers["set-cookie"]
        assert set_cookie.startswith(f"{COOKIE}=")
        assert "HttpOnly" in set_cookie
        assert "SameSite=lax" in set_cookie

    def test_email_is_case_insensitive(self, anon_client: TestClient, user: User) -> None:
        response = anon_client.post(
            LOGIN, json={"email": "  REP@leadflow.DEV ", "password": TEST_PASSWORD}
        )

        assert response.status_code == 200

    @pytest.mark.parametrize(
        ("email", "password"),
        [("rep@leadflow.dev", "wrong-password"), ("nobody@leadflow.dev", TEST_PASSWORD)],
    )
    def test_bad_credentials_return_401_without_revealing_which(
        self, anon_client: TestClient, user: User, email: str, password: str
    ) -> None:
        response = anon_client.post(LOGIN, json={"email": email, "password": password})

        assert response.status_code == 401
        assert response.json()["error"] == {
            "code": "invalid_credentials",
            "message": "Incorrect email or password.",
            "details": None,
        }
        assert "set-cookie" not in response.headers

    def test_inactive_user_cannot_sign_in(
        self, anon_client: TestClient, db: Session, user: User
    ) -> None:
        user.is_active = False
        db.flush()

        response = anon_client.post(LOGIN, json={"email": user.email, "password": TEST_PASSWORD})

        assert response.status_code == 401

    @pytest.mark.parametrize(
        ("payload", "field"),
        [({"email": "not-an-email", "password": "x"}, "email"), ({"email": "a@b.co"}, "password")],
    )
    def test_invalid_payload_returns_422(
        self, anon_client: TestClient, payload: dict[str, str], field: str
    ) -> None:
        response = anon_client.post(LOGIN, json=payload)

        assert response.status_code == 422
        assert field in {d["field"] for d in response.json()["error"]["details"]}


class TestSession:
    def test_me_returns_current_user(self, client: TestClient, user: User) -> None:
        response = client.get(ME)

        assert response.status_code == 200
        assert response.json()["email"] == "rep@leadflow.dev"

    def test_bearer_token_is_accepted(self, anon_client: TestClient, user: User) -> None:
        token, _ = create_access_token(user.id)

        response = anon_client.get(ME, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200

    def test_logout_clears_the_session(self, client: TestClient) -> None:
        response = client.post("/api/v1/auth/logout")

        assert response.status_code == 204
        assert f'{COOKIE}=""' in response.headers["set-cookie"]
        assert client.get(ME).status_code == 401

    @pytest.mark.parametrize(
        "token",
        [
            "not-a-jwt",
            jwt.encode(
                {"sub": "1", "exp": datetime.now(UTC) + timedelta(hours=1)},
                "a-different-secret-that-is-long-enough",
            ),
        ],
    )
    def test_invalid_tokens_are_rejected(self, anon_client: TestClient, token: str) -> None:
        response = anon_client.get(ME, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 401
        assert response.headers["WWW-Authenticate"] == "Bearer"
        assert response.json()["error"]["code"] == "not_authenticated"

    def test_expired_token_is_rejected(self, anon_client: TestClient, user: User) -> None:
        settings = get_settings()
        expired = jwt.encode(
            {"sub": str(user.id), "exp": datetime.now(UTC) - timedelta(minutes=1)},
            settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )

        response = anon_client.get(ME, headers={"Authorization": f"Bearer {expired}"})

        assert response.status_code == 401

    def test_token_for_deactivated_user_is_rejected(
        self, client: TestClient, db: Session, user: User
    ) -> None:
        user.is_active = False
        db.flush()

        assert client.get(ME).status_code == 401


class TestProtectedRoutes:
    @pytest.mark.parametrize(
        ("method", "path"),
        [
            ("GET", "/api/v1/leads"),
            ("POST", "/api/v1/leads"),
            ("GET", "/api/v1/leads/1"),
            ("PATCH", "/api/v1/leads/1"),
            ("GET", "/api/v1/leads/1/discussions"),
            ("POST", "/api/v1/leads/1/discussions"),
        ],
    )
    def test_lead_endpoints_require_a_session(
        self, anon_client: TestClient, method: str, path: str
    ) -> None:
        response = anon_client.request(method, path, json={})

        assert response.status_code == 401
        assert response.json()["error"]["code"] == "not_authenticated"

    def test_health_stays_public(self, anon_client: TestClient) -> None:
        assert anon_client.get("/api/v1/health").status_code == 200
