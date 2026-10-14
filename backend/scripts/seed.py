"""Seed the database with demo leads and discussions.

Usage (from `backend/`):
    uv run python -m scripts.seed            # seed only if the database has no leads
    uv run python -m scripts.seed --reset    # wipe all leads and re-seed
    uv run python -m scripts.seed --tz Asia/Kolkata

All timestamps are relative to the moment the script runs, so the demo always shows leads
with follow-ups due today, overdue, upcoming and none. Re-run with `--reset` to refresh them.

A demo account is also created if missing (DEMO_USER_EMAIL / DEMO_USER_PASSWORD, defaulting
to demo@leadflow.dev / leadflow123). `--reset` only touches leads, never users.

"Due today" follow-ups are kept before midnight in the viewer's timezone, taken from `--tz`,
the `SEED_TIMEZONE` environment variable, or the machine's local timezone (in that order).
"""

import argparse
import logging
import os
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta, tzinfo
from zoneinfo import ZoneInfo

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Discussion, DiscussionKind, Lead, LeadStatus
from app.services import auth_service

logger = logging.getLogger("seed")


@dataclass(frozen=True)
class Entry:
    ago: timedelta
    body: str
    kind: DiscussionKind = DiscussionKind.NOTE
    # Follow-up set while logging this entry, relative to *now* (negative = in the past).
    follow_up_in: timedelta | None = None
    # Keep the follow-up before local midnight so it always shows up as "today".
    due_today: bool = False


@dataclass(frozen=True)
class SeedLead:
    name: str
    company: str
    phone: str
    status: LeadStatus
    entries: list[Entry] = field(default_factory=list)


def _created(ago: timedelta, how: str = "manually") -> Entry:
    return Entry(ago, f"Lead created {how}.", DiscussionKind.SYSTEM)


DAY, HOUR, MINUTE = timedelta(days=1), timedelta(hours=1), timedelta(minutes=1)

SEED_LEADS: list[SeedLead] = [
    SeedLead(
        "Sarah Connor", "Acme Corp", "555-0199", LeadStatus.PROPOSAL_SENT,
        [
            _created(6 * DAY, "via web form"),
            Entry(5 * DAY, "Initial discovery call. They need a CRM for 50 reps. Pain points "
                         "include dropping leads and no follow-up tracking."),
            Entry(2 * DAY, "Sent pricing tier PDF. Said she would review with her boss.",
                  follow_up_in=2 * HOUR, due_today=True),
        ],
    ),
    SeedLead(
        "Peter Gibbons", "Initrode", "555-0142", LeadStatus.QUALIFIED,
        [
            _created(12 * DAY),
            Entry(10 * DAY, "Intro call: team of 12 analysts, currently tracking everything in "
                          "spreadsheets."),
            Entry(4 * DAY, "Demo went well. Asked for a security questionnaire before moving "
                         "forward.", follow_up_in=-1 * DAY),  # overdue
        ],
    ),
    SeedLead(
        "Hank Scorpio", "Globex", "555-0177", LeadStatus.NEW,
        [
            _created(2 * HOUR + MINUTE, "via web form"),
            Entry(2 * HOUR, "Inbound lead from website contact form."),
        ],
    ),
    SeedLead(
        "Tony Stark", "Stark Industries", "555-0110", LeadStatus.QUALIFIED,
        [
            _created(20 * DAY),
            Entry(18 * DAY, "Met at SaaS Connect conference. Interested in pipeline analytics."),
            Entry(9 * DAY, "Technical deep-dive with their CTO. Needs SSO and audit logs."),
            Entry(1 * DAY, "Sent SSO documentation. Will regroup after their internal review.",
                  follow_up_in=4 * HOUR, due_today=True),
        ],
    ),
    SeedLead(
        "Bill Lumbergh", "Initech", "555-0123", LeadStatus.CONTACTED,
        [
            _created(10 * DAY),
            Entry(7 * DAY, "Left a voicemail with his assistant.",
                  follow_up_in=3 * DAY),  # upcoming
        ],
    ),
    SeedLead(
        "Monty Burns", "Burns Power", "555-0160", LeadStatus.CONTACTED,
        [
            _created(15 * DAY),
            Entry(13 * DAY, "Sent intro email and two case studies."),
            Entry(6 * DAY, "Asked us to call back early next week.",
                  follow_up_in=-3 * DAY),  # overdue
        ],
    ),
    SeedLead(
        "Bruce Wayne", "Wayne Ent", "555-0100", LeadStatus.WON,
        [
            _created(45 * DAY),
            Entry(40 * DAY, "Referred by Lucius Fox. Large enterprise opportunity."),
            Entry(30 * DAY, "Proposal sent: 200 seats, annual billing."),
            Entry(21 * DAY + MINUTE, "Status changed from Proposal Sent to Won.",
                  DiscussionKind.SYSTEM),
            Entry(21 * DAY, "Contract signed! Sending welcome package."),
        ],
    ),
    SeedLead(
        "Gavin Belson", "Hooli", "555-0188", LeadStatus.LOST,
        [
            _created(30 * DAY),
            Entry(25 * DAY, "Evaluating us against two competitors."),
            Entry(14 * DAY, "Went with an in-house solution. Revisit next fiscal year."),
        ],
    ),
]  # fmt: skip


def _end_of_day(now: datetime, tz: tzinfo) -> datetime:
    tomorrow = (now.astimezone(tz) + DAY).date()
    return datetime(tomorrow.year, tomorrow.month, tomorrow.day, tzinfo=tz).astimezone(UTC)


def _follow_up_at(entry: Entry, now: datetime, tz: tzinfo) -> datetime | None:
    if entry.follow_up_in is None:
        return None
    follow_up = now + entry.follow_up_in
    if entry.due_today:
        follow_up = min(follow_up, _end_of_day(now, tz) - 15 * MINUTE)
    return follow_up


def build_lead(seed: SeedLead, now: datetime, tz: tzinfo) -> Lead:
    discussions = [
        Discussion(
            body=entry.body,
            kind=entry.kind,
            created_at=now - entry.ago,
            follow_up_at=_follow_up_at(entry, now, tz),
        )
        for entry in seed.entries
    ]
    follow_ups = [entry.follow_up_at for entry in discussions if entry.follow_up_at is not None]
    created_at = min(entry.created_at for entry in discussions)
    return Lead(
        name=seed.name,
        company=seed.company,
        phone=seed.phone,
        status=seed.status,
        # The most recently scheduled follow-up is the lead's current one.
        next_follow_up_at=follow_ups[-1] if follow_ups else None,
        last_activity_at=max(entry.created_at for entry in discussions),
        created_at=created_at,
        updated_at=created_at,
        discussions=discussions,
    )


DEMO_USER_NAME = "Demo Rep"


def ensure_demo_user(db: Session) -> None:
    email = os.environ.get("DEMO_USER_EMAIL") or "demo@leadflow.dev"
    password = os.environ.get("DEMO_USER_PASSWORD") or "leadflow123"
    if auth_service.get_user_by_email(db, email) is None:
        auth_service.create_user(db, email=email, name=DEMO_USER_NAME, password=password)
        logger.info("Created demo user %s.", email)


def seed(db: Session, *, reset: bool = False, tz: tzinfo = UTC) -> int:
    """Insert demo data. Returns the number of leads created (0 if skipped)."""
    if reset:
        db.execute(text("TRUNCATE discussions, leads RESTART IDENTITY CASCADE"))
    elif db.scalar(select(func.count()).select_from(Lead)):
        logger.info("Database already has leads; skipping seed (use --reset to re-seed).")
        return 0

    now = datetime.now(UTC)
    db.add_all(build_lead(seed_lead, now, tz) for seed_lead in SEED_LEADS)
    db.commit()
    logger.info("Seeded %d leads.", len(SEED_LEADS))
    return len(SEED_LEADS)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed LeadFlow with demo data.")
    parser.add_argument("--reset", action="store_true", help="delete all leads before seeding")
    parser.add_argument(
        "--tz",
        default=os.environ.get("SEED_TIMEZONE") or None,
        help="IANA timezone used to decide what 'today' means, e.g. Asia/Kolkata",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")
    tz: tzinfo = ZoneInfo(args.tz) if args.tz else datetime.now().astimezone().tzinfo or UTC
    with SessionLocal() as db:
        ensure_demo_user(db)
        seed(db, reset=args.reset, tz=tz)


if __name__ == "__main__":
    main()
