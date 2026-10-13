"""Domain errors and the exception handlers that render them as a consistent JSON envelope.

Every error response has the shape::

    {"error": {"code": "lead_not_found", "message": "Lead 42 does not exist.", "details": null}}
"""

import logging
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for errors that map cleanly onto an HTTP response."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    code: str = "internal_error"
    message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None, *, details: Any = None) -> None:
        self.message = message or self.message
        self.details = details
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"
    message = "Resource not found."


class LeadNotFoundError(NotFoundError):
    code = "lead_not_found"

    def __init__(self, lead_id: int) -> None:
        super().__init__(f"Lead {lead_id} does not exist.")


class ServiceUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "service_unavailable"
    message = "The service is temporarily unavailable. Please try again shortly."


def error_response(status_code: int, code: str, message: str, details: Any = None) -> JSONResponse:
    content = {"error": {"code": code, "message": message, "details": details}}
    return JSONResponse(status_code=status_code, content=jsonable_encoder(content))


def _field_path(loc: tuple[int | str, ...]) -> str:
    # ("body", "follow_up_at") -> "follow_up_at"; ("query", "status") -> "status"
    parts = [str(part) for part in loc if part not in ("body", "query", "path")]
    return ".".join(parts) or "body"


async def _handle_app_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    return error_response(exc.status_code, exc.code, exc.message, exc.details)


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    errors = exc.errors()
    if any(error.get("type") == "json_invalid" for error in errors):
        return error_response(
            status.HTTP_400_BAD_REQUEST, "bad_request", "Request body is not valid JSON."
        )
    details = [
        {"field": _field_path(tuple(error["loc"])), "message": error["msg"], "type": error["type"]}
        for error in errors
    ]
    return error_response(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "validation_error",
        "One or more fields are invalid.",
        details,
    )


async def _handle_http_exception(_: Request, exc: Exception) -> JSONResponse:
    """Wrap framework-level errors (unknown route, wrong method, ...) in the same envelope."""
    assert isinstance(exc, StarletteHTTPException)
    phrase = HTTPStatus(exc.status_code).phrase
    code = phrase.lower().replace(" ", "_").replace("-", "_")
    message = exc.detail if isinstance(exc.detail, str) else phrase
    return error_response(exc.status_code, code, message)


async def _handle_db_unavailable(_: Request, exc: Exception) -> JSONResponse:
    logger.error("Database unavailable: %s", exc)
    error = ServiceUnavailableError()
    return error_response(error.status_code, error.code, error.message)


async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error", exc_info=exc)
    error = AppError()
    return error_response(error.status_code, error.code, error.message)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(OperationalError, _handle_db_unavailable)
    app.add_exception_handler(Exception, _handle_unexpected)
