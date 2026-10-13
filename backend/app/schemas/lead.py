import re
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, Field, StringConstraints, field_validator

from app.models.enums import DiscussionKind, LeadStatus
from app.schemas.common import InputModel, OutputModel, blank_to_none

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Company = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
PHONE_PATTERN = re.compile(r"^[0-9+()\-\s.]{3,40}$")


def _validate_phone(value: str) -> str:
    if not PHONE_PATTERN.fullmatch(value):
        raise ValueError("Enter a valid phone number (digits, spaces and + ( ) - . only)")
    return value


Phone = Annotated[
    str,
    StringConstraints(strip_whitespace=True),
    AfterValidator(_validate_phone),
    Field(examples=["555-0199"]),
]


class LeadCreate(InputModel):
    name: Name = Field(examples=["Sarah Connor"])
    company: Company | None = Field(default=None, examples=["Acme Corp"])
    phone: Phone | None = None
    status: LeadStatus = LeadStatus.NEW

    _blank_to_none = field_validator("company", "phone", mode="before")(blank_to_none)


class LeadUpdate(InputModel):
    """Partial update — only the fields present in the request body are changed."""

    name: Name | None = None
    company: Company | None = None
    phone: Phone | None = None
    status: LeadStatus | None = None

    _blank_to_none = field_validator("company", "phone", mode="before")(blank_to_none)

    @field_validator("name", "status")
    @classmethod
    def reject_explicit_null(cls, value: object) -> object:
        # Runs only for fields present in the payload: omitting them is fine, `null` is not.
        if value is None:
            raise ValueError("Field cannot be null")
        return value


class DiscussionPreview(OutputModel):
    body: str
    kind: DiscussionKind
    created_at: datetime


class LeadRead(OutputModel):
    id: int
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    next_follow_up_at: datetime | None
    last_activity_at: datetime
    created_at: datetime
    updated_at: datetime
    last_discussion: DiscussionPreview | None = Field(
        default=None,
        description="Most recent note by the rep (falls back to the latest system entry).",
    )
