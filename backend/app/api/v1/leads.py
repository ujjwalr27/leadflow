from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import LeadStatus
from app.schemas.common import NOT_FOUND, VALIDATION
from app.schemas.lead import LeadCreate, LeadRead, LeadUpdate
from app.services import lead_service

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", summary="List leads", responses=VALIDATION)
def list_leads(
    db: Annotated[Session, Depends(get_db)],
    status_filter: Annotated[
        LeadStatus | None, Query(alias="status", description="Only leads with this status.")
    ] = None,
    search: Annotated[
        str | None, Query(max_length=120, description="Case-insensitive match on name.")
    ] = None,
) -> list[LeadRead]:
    """Leads ordered by most recent activity, each with its latest discussion."""
    return lead_service.list_leads(db, status=status_filter, search=search)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a lead",
    responses=VALIDATION,
)
def create_lead(
    payload: LeadCreate,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> LeadRead:
    lead = lead_service.create_lead(db, payload)
    response.headers["Location"] = str(request.url_for("get_lead", lead_id=lead.id))
    return lead


@router.get("/{lead_id}", summary="Get a lead", responses=NOT_FOUND)
def get_lead(lead_id: int, db: Annotated[Session, Depends(get_db)]) -> LeadRead:
    return lead_service.get_lead(db, lead_id)


@router.patch("/{lead_id}", summary="Update a lead", responses=NOT_FOUND | VALIDATION)
def update_lead(
    lead_id: int, payload: LeadUpdate, db: Annotated[Session, Depends(get_db)]
) -> LeadRead:
    """Partially update a lead. Changing `status` is recorded in the lead's timeline."""
    return lead_service.update_lead(db, lead_id, payload)
