from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DiscussionKind

if TYPE_CHECKING:
    from app.models.lead import Lead


class Discussion(Base):
    __tablename__ = "discussions"

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)
    kind: Mapped[DiscussionKind] = mapped_column(
        Enum(
            DiscussionKind,
            name="discussion_kind",
            values_callable=lambda enum: [member.value for member in enum],
        ),
        default=DiscussionKind.NOTE,
        server_default=DiscussionKind.NOTE.value,
    )
    # Follow-up scheduled while logging this discussion (shown as a chip in the timeline).
    follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lead: Mapped[Lead] = relationship(back_populates="discussions")

    # Fetch server-generated `created_at` via RETURNING on insert.
    __mapper_args__ = {"eager_defaults": True}  # noqa: RUF012  (SQLAlchemy convention)

    def __repr__(self) -> str:
        return f"<Discussion id={self.id} lead_id={self.lead_id} kind={self.kind}>"


# Serves "timeline for a lead, newest first" and "latest discussion per lead".
Index("ix_discussions_lead_id_created_at", Discussion.lead_id, Discussion.created_at.desc())
