"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import NotAuthenticatedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User
from app.services import auth_service

# `auto_error=False`: a missing header is fine when the session cookie is present.
_bearer = HTTPBearer(auto_error=False, description="Token from POST /auth/login")


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    """Resolve the signed-in user from the session cookie or an `Authorization: Bearer` token."""
    token = (
        credentials.credentials
        if credentials
        else request.cookies.get(get_settings().auth_cookie_name)
    )
    user_id = decode_access_token(token) if token else None
    user = auth_service.get_active_user(db, user_id) if user_id is not None else None
    if user is None:
        raise NotAuthenticatedError()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
