from datetime import UTC, datetime, timedelta
from typing import Annotated, Self

from pydantic import AwareDatetime, Field, StringConstraints, field_validator, model_validator

from app.models.enums import DiscussionKind
from app.schemas.common import InputModel, OutputModel
from app.schemas.lead import LeadRead

# Allow for small clock differences between the browser and the server.
FOLLOW_UP_PAST_TOLERANCE = timedelta(seconds=60)

Body = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class DiscussionCreate(InputModel):
    body: Body = Field(examples=["Called — they want a demo next week."])
    follow_up_at: AwareDatetime | None = Field(
        default=None,
        description="Next follow-up (ISO 8601 with timezone). Becomes the lead's follow-up.",
        examples=["2026-10-15T09:30:00+05:30"],
    )
    clear_follow_up: bool = Field(
        default=False,
        description="Mark the lead's current follow-up as done. Ignored if `follow_up_at` is set.",
    )

    @field_validator("follow_up_at")
    @classmethod
    def must_not_be_in_past(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        value = value.astimezone(UTC)
        if value < datetime.now(UTC) - FOLLOW_UP_PAST_TOLERANCE:
            raise ValueError("Follow-up must be in the future")
        return value

    @model_validator(mode="after")
    def new_follow_up_wins(self) -> Self:
        if self.follow_up_at is not None:
            self.clear_follow_up = False
        return self


class DiscussionRead(OutputModel):
    id: int
    lead_id: int
    body: str
    kind: DiscussionKind
    follow_up_at: datetime | None
    created_at: datetime


class DiscussionCreated(OutputModel):
    """Returned after logging a discussion: the new entry plus the lead's updated state."""

    discussion: DiscussionRead
    lead: LeadRead
