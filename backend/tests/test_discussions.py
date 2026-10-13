from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Discussion

CreateLead = Callable[..., dict[str, Any]]


def _in(hours: float) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


def _url(lead_id: int) -> str:
    return f"/api/v1/leads/{lead_id}/discussions"


class TestListDiscussions:
    def test_returns_newest_first(
        self, client: TestClient, db: Session, create_lead: CreateLead
    ) -> None:
        lead = create_lead()
        base = datetime.now(UTC) - timedelta(days=10)
        db.add_all(
            [
                Discussion(lead_id=lead["id"], body="Oldest", created_at=base),
                Discussion(lead_id=lead["id"], body="Newest", created_at=base + timedelta(days=2)),
                Discussion(lead_id=lead["id"], body="Middle", created_at=base + timedelta(days=1)),
            ]
        )
        db.flush()

        bodies = [entry["body"] for entry in client.get(_url(lead["id"])).json()]

        # "Lead created." was inserted "now", so it is the most recent entry.
        assert bodies == ["Lead created.", "Newest", "Middle", "Oldest"]

    def test_unknown_lead_returns_404(self, client: TestClient) -> None:
        response = client.get(_url(999999))

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "lead_not_found"


class TestCreateDiscussion:
    def test_returns_201_with_discussion_and_updated_lead(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        lead = create_lead()

        response = client.post(_url(lead["id"]), json={"body": "  Sent pricing PDF.  "})

        assert response.status_code == 201
        body = response.json()
        assert body["discussion"]["body"] == "Sent pricing PDF."
        assert body["discussion"]["kind"] == "note"
        assert body["lead"]["id"] == lead["id"]
        assert body["lead"]["last_discussion"]["body"] == "Sent pricing PDF."

    def test_follow_up_updates_lead_in_list(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        lead = create_lead()
        follow_up = datetime.now(UTC) + timedelta(hours=2)

        client.post(
            _url(lead["id"]), json={"body": "Call back", "follow_up_at": follow_up.isoformat()}
        )

        listed = client.get("/api/v1/leads").json()[0]
        assert datetime.fromisoformat(listed["next_follow_up_at"]) == follow_up

    def test_follow_up_is_normalised_to_utc(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        lead = create_lead()
        local = (datetime.now(UTC) + timedelta(days=1)).astimezone(
            datetime.now().astimezone().tzinfo
        )

        body = client.post(
            _url(lead["id"]),
            json={"body": "Demo", "follow_up_at": local.replace(microsecond=0).isoformat()},
        ).json()

        stored = datetime.fromisoformat(body["lead"]["next_follow_up_at"])
        assert stored.utcoffset() == timedelta(0)
        assert stored == local.replace(microsecond=0)

    def test_note_without_follow_up_keeps_existing_one(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        lead = create_lead()
        client.post(_url(lead["id"]), json={"body": "Schedule", "follow_up_at": _in(5)})

        body = client.post(_url(lead["id"]), json={"body": "Quick update"}).json()

        assert body["lead"]["next_follow_up_at"] is not None

    def test_clear_follow_up_marks_it_done(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        lead = create_lead()
        client.post(_url(lead["id"]), json={"body": "Schedule", "follow_up_at": _in(5)})

        body = client.post(
            _url(lead["id"]), json={"body": "Called", "clear_follow_up": True}
        ).json()

        assert body["lead"]["next_follow_up_at"] is None

    def test_new_follow_up_wins_over_clear(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        lead = create_lead()

        body = client.post(
            _url(lead["id"]),
            json={"body": "Rescheduled", "follow_up_at": _in(24), "clear_follow_up": True},
        ).json()

        assert body["lead"]["next_follow_up_at"] is not None

    @pytest.mark.parametrize(
        ("payload", "field"),
        [
            ({}, "body"),
            ({"body": "   "}, "body"),
            ({"body": "x" * 5001}, "body"),
            ({"body": "Late", "follow_up_at": "2020-01-01T09:00:00Z"}, "follow_up_at"),
            ({"body": "Naive", "follow_up_at": "2030-01-01T09:00:00"}, "follow_up_at"),
            ({"body": "Bad", "follow_up_at": "tomorrow"}, "follow_up_at"),
        ],
    )
    def test_invalid_payload_returns_422(
        self, client: TestClient, create_lead: CreateLead, payload: dict[str, Any], field: str
    ) -> None:
        lead = create_lead()

        response = client.post(_url(lead["id"]), json=payload)

        assert response.status_code == 422
        assert field in {detail["field"] for detail in response.json()["error"]["details"]}

    def test_unknown_lead_returns_404(self, client: TestClient) -> None:
        response = client.post(_url(999999), json={"body": "Hello"})

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "lead_not_found"
