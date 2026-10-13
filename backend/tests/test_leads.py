from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Discussion, DiscussionKind, Lead

CreateLead = Callable[..., dict[str, Any]]


def _error_fields(response: Any) -> set[str]:
    return {detail["field"] for detail in response.json()["error"]["details"]}


class TestCreateLead:
    def test_returns_201_with_location_and_defaults(self, client: TestClient) -> None:
        response = client.post("/api/v1/leads", json={"name": "  Sarah Connor  "})

        assert response.status_code == 201
        lead = response.json()
        assert response.headers["Location"].endswith(f"/api/v1/leads/{lead['id']}")
        assert lead["name"] == "Sarah Connor"
        assert lead["status"] == "new"
        assert lead["company"] is None
        assert lead["phone"] is None
        assert lead["next_follow_up_at"] is None

    def test_records_lead_created_system_entry(self, client: TestClient) -> None:
        lead = client.post("/api/v1/leads", json={"name": "Hank Scorpio"}).json()

        assert lead["last_discussion"]["body"] == "Lead created."
        assert lead["last_discussion"]["kind"] == "system"

    def test_blank_optional_fields_become_null(self, client: TestClient) -> None:
        lead = client.post(
            "/api/v1/leads", json={"name": "Bill", "company": "   ", "phone": ""}
        ).json()

        assert lead["company"] is None
        assert lead["phone"] is None

    @pytest.mark.parametrize(
        ("payload", "field"),
        [
            ({}, "name"),
            ({"name": "   "}, "name"),
            ({"name": "x" * 121}, "name"),
            ({"name": "Bill", "phone": "call me maybe"}, "phone"),
            ({"name": "Bill", "status": "archived"}, "status"),
            ({"name": "Bill", "owner": "me"}, "owner"),
        ],
    )
    def test_invalid_payload_returns_422(
        self, client: TestClient, payload: dict[str, Any], field: str
    ) -> None:
        response = client.post("/api/v1/leads", json=payload)

        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"
        assert field in _error_fields(response)

    def test_malformed_json_returns_400(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/leads", content="{not json", headers={"Content-Type": "application/json"}
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "bad_request"


class TestListLeads:
    def test_new_discussion_moves_lead_to_top(
        self, client: TestClient, db: Session, create_lead: CreateLead
    ) -> None:
        older = create_lead("Older")
        recent = create_lead("Recent")
        now = datetime.now(UTC)
        db.get_one(Lead, older["id"]).last_activity_at = now - timedelta(days=2)
        db.get_one(Lead, recent["id"]).last_activity_at = now - timedelta(days=1)
        db.flush()
        assert [lead["name"] for lead in client.get("/api/v1/leads").json()] == ["Recent", "Older"]

        client.post(f"/api/v1/leads/{older['id']}/discussions", json={"body": "Called again"})

        assert [lead["name"] for lead in client.get("/api/v1/leads").json()] == ["Older", "Recent"]

    def test_filters_by_status(self, client: TestClient, create_lead: CreateLead) -> None:
        create_lead("Won Lead", status="won")
        create_lead("New Lead")

        leads = client.get("/api/v1/leads", params={"status": "won"}).json()

        assert [lead["name"] for lead in leads] == ["Won Lead"]

    def test_search_is_case_insensitive_partial_match(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        create_lead("Sarah Connor")
        create_lead("John Connor")
        create_lead("Hank Scorpio")

        leads = client.get("/api/v1/leads", params={"search": "CONN"}).json()

        assert sorted(lead["name"] for lead in leads) == ["John Connor", "Sarah Connor"]

    def test_search_treats_wildcards_literally(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        create_lead("100% Legit")
        create_lead("Hank Scorpio")

        leads = client.get("/api/v1/leads", params={"search": "%"}).json()

        assert [lead["name"] for lead in leads] == ["100% Legit"]

    def test_status_and_search_combine(self, client: TestClient, create_lead: CreateLead) -> None:
        create_lead("Sarah Connor", status="qualified")
        create_lead("Sarah Lee")

        leads = client.get("/api/v1/leads", params={"status": "qualified", "search": "sarah"})

        assert [lead["name"] for lead in leads.json()] == ["Sarah Connor"]

    def test_invalid_status_filter_returns_422(self, client: TestClient) -> None:
        response = client.get("/api/v1/leads", params={"status": "archived"})

        assert response.status_code == 422
        assert _error_fields(response) == {"status"}

    def test_last_discussion_prefers_rep_notes_over_system_entries(
        self, client: TestClient, db: Session, create_lead: CreateLead
    ) -> None:
        lead = create_lead()
        now = datetime.now(UTC)
        db.add_all(
            [
                Discussion(lead_id=lead["id"], body="Discovery call", created_at=now),
                Discussion(
                    lead_id=lead["id"],
                    body="Status changed from New to Contacted.",
                    kind=DiscussionKind.SYSTEM,
                    created_at=now + timedelta(minutes=5),
                ),
            ]
        )
        db.flush()

        listed = client.get("/api/v1/leads").json()[0]

        assert listed["last_discussion"]["body"] == "Discovery call"


class TestGetLead:
    def test_returns_lead(self, client: TestClient, create_lead: CreateLead) -> None:
        lead = create_lead("Bruce Wayne", company="Wayne Ent", phone="555-0100")

        response = client.get(f"/api/v1/leads/{lead['id']}")

        assert response.status_code == 200
        assert response.json()["company"] == "Wayne Ent"

    def test_unknown_lead_returns_404_envelope(self, client: TestClient) -> None:
        response = client.get("/api/v1/leads/999999")

        assert response.status_code == 404
        assert response.json() == {
            "error": {
                "code": "lead_not_found",
                "message": "Lead 999999 does not exist.",
                "details": None,
            }
        }


class TestUpdateLead:
    def test_status_change_persists_and_is_logged(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        lead = create_lead()

        response = client.patch(f"/api/v1/leads/{lead['id']}", json={"status": "proposal_sent"})

        assert response.status_code == 200
        assert client.get(f"/api/v1/leads/{lead['id']}").json()["status"] == "proposal_sent"
        timeline = client.get(f"/api/v1/leads/{lead['id']}/discussions").json()
        assert timeline[0]["body"] == "Status changed from New to Proposal Sent."
        assert timeline[0]["kind"] == "system"

    def test_same_status_is_not_logged(self, client: TestClient, create_lead: CreateLead) -> None:
        lead = create_lead()

        client.patch(f"/api/v1/leads/{lead['id']}", json={"status": "new"})

        timeline = client.get(f"/api/v1/leads/{lead['id']}/discussions").json()
        assert [entry["body"] for entry in timeline] == ["Lead created."]

    def test_partial_update_leaves_other_fields(
        self, client: TestClient, create_lead: CreateLead
    ) -> None:
        lead = create_lead("Bill", company="Initech")

        updated = client.patch(f"/api/v1/leads/{lead['id']}", json={"phone": "555-0123"}).json()

        assert updated["phone"] == "555-0123"
        assert updated["company"] == "Initech"
        assert updated["status"] == "new"

    @pytest.mark.parametrize("payload", [{"name": None}, {"status": None}, {"status": "nope"}])
    def test_invalid_update_returns_422(
        self, client: TestClient, create_lead: CreateLead, payload: dict[str, Any]
    ) -> None:
        lead = create_lead()

        response = client.patch(f"/api/v1/leads/{lead['id']}", json=payload)

        assert response.status_code == 422
        assert _error_fields(response) == set(payload)

    def test_unknown_lead_returns_404(self, client: TestClient) -> None:
        response = client.patch("/api/v1/leads/999999", json={"status": "won"})

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "lead_not_found"
