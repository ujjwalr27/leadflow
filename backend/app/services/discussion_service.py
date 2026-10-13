"""Discussion (timeline) use cases.

Follow-up rules (see IMPLEMENTATION_PLAN.md §3.2):
- A note with `follow_up_at` sets the lead's next follow-up.
- A note with `clear_follow_up` marks the current follow-up as done.
- Otherwise the lead's existing follow-up is left untouched.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Discussion, DiscussionKind
from app.schemas.discussion import DiscussionCreate, DiscussionCreated, DiscussionRead
from app.services.lead_service import add_timeline_entry, get_lead, get_lead_or_404


def list_discussions(db: Session, lead_id: int) -> list[DiscussionRead]:
    """Full timeline for a lead, newest first."""
    get_lead_or_404(db, lead_id)
    stmt = (
        select(Discussion)
        .where(Discussion.lead_id == lead_id)
        .order_by(Discussion.created_at.desc(), Discussion.id.desc())
    )
    return [DiscussionRead.model_validate(discussion) for discussion in db.scalars(stmt)]


def create_discussion(db: Session, lead_id: int, data: DiscussionCreate) -> DiscussionCreated:
    lead = get_lead_or_404(db, lead_id)
    discussion = add_timeline_entry(
        db, lead, body=data.body, kind=DiscussionKind.NOTE, follow_up_at=data.follow_up_at
    )
    if data.follow_up_at is not None:
        lead.next_follow_up_at = data.follow_up_at
    elif data.clear_follow_up:
        lead.next_follow_up_at = None

    db.commit()
    return DiscussionCreated(
        discussion=DiscussionRead.model_validate(discussion),
        lead=get_lead(db, lead_id),
    )
