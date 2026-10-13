"""Lead use cases: listing, creating and updating leads.

Business rules (see IMPLEMENTATION_PLAN.md §3.2):
- Creating a lead also records a "Lead created." system entry, so a timeline is never empty.
- Changing status records a "Status changed from X to Y" system entry.
- Any new timeline entry bumps `last_activity_at`, which drives the default ordering.
"""

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import Select, select, true
from sqlalchemy.orm import Session, aliased

from app.core.errors import LeadNotFoundError
from app.models import Discussion, DiscussionKind, Lead, LeadStatus
from app.schemas.lead import DiscussionPreview, LeadCreate, LeadRead, LeadUpdate

LEAD_CREATED_NOTE = "Lead created."


def _with_last_discussion() -> Select[Lead, Discussion]:
    """Select leads joined to their latest rep note (or latest system entry if none).

    Uses a LATERAL subquery so the whole list is fetched in a single round trip (no N+1).
    """
    latest = (
        select(Discussion)
        .where(Discussion.lead_id == Lead.id)
        .order_by(
            (Discussion.kind == DiscussionKind.NOTE).desc(),
            Discussion.created_at.desc(),
            Discussion.id.desc(),
        )
        .limit(1)
        .lateral("latest_discussion")
    )
    latest_discussion = aliased(Discussion, latest)
    return select(Lead, latest_discussion).outerjoin(latest, true())


def _to_read(lead: Lead, last: Discussion | None) -> LeadRead:
    read = LeadRead.model_validate(lead)
    read.last_discussion = DiscussionPreview.model_validate(last) if last else None
    return read


def add_timeline_entry(
    db: Session,
    lead: Lead,
    *,
    body: str,
    kind: DiscussionKind,
    follow_up_at: datetime | None = None,
) -> Discussion:
    """Insert a discussion and bump the lead's `last_activity_at` to its timestamp."""
    discussion = Discussion(lead_id=lead.id, body=body, kind=kind, follow_up_at=follow_up_at)
    db.add(discussion)
    db.flush()  # populates the server-generated `created_at`
    lead.last_activity_at = discussion.created_at
    return discussion


def get_lead_or_404(db: Session, lead_id: int) -> Lead:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise LeadNotFoundError(lead_id)
    return lead


def list_leads(
    db: Session, *, status: LeadStatus | None = None, search: str | None = None
) -> list[LeadRead]:
    stmt = _with_last_discussion().order_by(Lead.last_activity_at.desc(), Lead.id.desc())
    if status is not None:
        stmt = stmt.where(Lead.status == status)
    if search:
        stmt = stmt.where(Lead.name.icontains(search.strip(), autoescape=True))
    rows: Sequence[tuple[Lead, Discussion | None]] = db.execute(stmt).tuples().all()
    return [_to_read(lead, last) for lead, last in rows]


def get_lead(db: Session, lead_id: int) -> LeadRead:
    row = db.execute(_with_last_discussion().where(Lead.id == lead_id)).tuples().one_or_none()
    if row is None:
        raise LeadNotFoundError(lead_id)
    lead, last = row
    return _to_read(lead, last)


def create_lead(db: Session, data: LeadCreate) -> LeadRead:
    lead = Lead(**data.model_dump())
    lead.discussions.append(Discussion(body=LEAD_CREATED_NOTE, kind=DiscussionKind.SYSTEM))
    db.add(lead)
    db.commit()
    return get_lead(db, lead.id)


def update_lead(db: Session, lead_id: int, data: LeadUpdate) -> LeadRead:
    lead = get_lead_or_404(db, lead_id)
    changes = data.model_dump(exclude_unset=True)

    new_status = changes.pop("status", None)
    if new_status is not None and new_status != lead.status:
        add_timeline_entry(
            db,
            lead,
            body=f"Status changed from {lead.status.label} to {new_status.label}.",
            kind=DiscussionKind.SYSTEM,
        )
        lead.status = new_status

    for field, value in changes.items():
        setattr(lead, field, value)

    db.commit()
    return get_lead(db, lead.id)
