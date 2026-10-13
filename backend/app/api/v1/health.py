from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import ServiceUnavailableError
from app.db.session import get_db
from app.schemas.common import ErrorResponse

router = APIRouter(tags=["health"])


class HealthStatus(BaseModel):
    status: str
    database: str


@router.get(
    "/health",
    summary="Liveness and database connectivity check",
    responses={503: {"model": ErrorResponse}},
)
def health(db: Annotated[Session, Depends(get_db)]) -> HealthStatus:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise ServiceUnavailableError("Database is unreachable.") from exc
    return HealthStatus(status="ok", database="ok")
