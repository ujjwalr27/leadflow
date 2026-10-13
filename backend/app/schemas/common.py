from typing import Any

from pydantic import BaseModel, ConfigDict


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Any = None


class ErrorResponse(BaseModel):
    """Envelope returned by every non-2xx response."""

    error: ErrorBody


class InputModel(BaseModel):
    """Base for request bodies: trims strings and rejects unknown fields."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class OutputModel(BaseModel):
    """Base for response bodies: can be built directly from ORM objects."""

    model_config = ConfigDict(from_attributes=True)


def blank_to_none(value: Any) -> Any:
    """Treat empty / whitespace-only optional strings as "not provided"."""
    if isinstance(value, str) and not value.strip():
        return None
    return value


# Shared OpenAPI documentation for error responses.
NOT_FOUND = {404: {"model": ErrorResponse, "description": "Lead not found"}}
VALIDATION = {422: {"model": ErrorResponse, "description": "Invalid input"}}
