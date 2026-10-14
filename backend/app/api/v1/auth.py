from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserRead
from app.schemas.common import UNAUTHORIZED, VALIDATION
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", summary="Sign in", responses=UNAUTHORIZED | VALIDATION)
def login(
    payload: LoginRequest, response: Response, db: Annotated[Session, Depends(get_db)]
) -> TokenResponse:
    """Verify credentials and start a session.

    Sets an httpOnly session cookie for browsers and also returns the token for API clients.
    """
    user = auth_service.authenticate(db, payload.email, payload.password)
    token, expires_at = create_access_token(user.id)
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return TokenResponse(
        access_token=token, expires_at=expires_at, user=UserRead.model_validate(user)
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Sign out")
def logout(response: Response) -> None:
    """End the browser session by clearing the session cookie."""
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.get("/me", summary="Current user", responses=UNAUTHORIZED)
def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)
