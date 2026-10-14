from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field

from app.schemas.common import InputModel, OutputModel


class LoginRequest(InputModel):
    email: EmailStr = Field(examples=["demo@leadflow.dev"])
    # Not stripped or length-checked beyond a sane maximum: passwords are compared verbatim.
    password: str = Field(min_length=1, max_length=128, examples=["leadflow123"])


class UserRead(OutputModel):
    id: int
    email: str
    name: str


class TokenResponse(OutputModel):
    """Returned on login. Browsers use the httpOnly cookie; API clients can use the token."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    user: UserRead
