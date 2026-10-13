from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import NOT_FOUND, VALIDATION
from app.schemas.discussion import DiscussionCreate, DiscussionCreated, DiscussionRead
from app.services import discussion_service

router = APIRouter(prefix="/leads/{lead_id}/discussions", tags=["discussions"])


@router.get("", summary="List a lead's discussions", responses=NOT_FOUND)
def list_discussions(lead_id: int, db: Annotated[Session, Depends(get_db)]) -> list[DiscussionRead]:
    """The lead's full timeline in reverse chronological order (newest first)."""
    return discussion_service.list_discussions(db, lead_id)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Log a discussion",
    responses=NOT_FOUND | VALIDATION,
)
def create_discussion(
    lead_id: int, payload: DiscussionCreate, db: Annotated[Session, Depends(get_db)]
) -> DiscussionCreated:
    """Add a note to the lead's timeline, optionally scheduling (or completing) a follow-up.

    Returns the new discussion together with the lead's updated state so clients can
    refresh the lead list without another request.
    """
    return discussion_service.create_discussion(db, lead_id, payload)
