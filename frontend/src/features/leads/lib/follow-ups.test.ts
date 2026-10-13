import { describe, expect, it } from "vitest";

import type { Lead } from "../types";
import { classifyFollowUp, isFollowUpDue, partitionLeads } from "./follow-ups";

// Tests run in Asia/Kolkata (UTC+05:30) — see vitest.config.ts.
const local = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

const NOW = new Date(2026, 9, 13, 21, 30); // Tue 13 Oct 2026, 21:30 local

function lead(overrides: Partial<Lead> & Pick<Lead, "id">): Lead {
  return {
    name: `Lead ${overrides.id}`,
    company: null,
    phone: null,
    status: "new",
    next_follow_up_at: null,
    last_activity_at: local(2026, 10, 1),
    created_at: local(2026, 10, 1),
    updated_at: local(2026, 10, 1),
    last_discussion: null,
    ...overrides,
  };
}

describe("classifyFollowUp", () => {
  it.each([
    ["no follow-up", null, "none"],
    ["later today", local(2026, 10, 13, 23, 45), "today"],
    ["one minute before local midnight", local(2026, 10, 13, 23, 59), "today"],
    ["just after local midnight", local(2026, 10, 14, 0, 1), "upcoming"],
    ["earlier today", local(2026, 10, 13, 9, 0), "overdue"],
    ["yesterday", local(2026, 10, 12, 14, 0), "overdue"],
    ["next week", local(2026, 10, 20, 10, 0), "upcoming"],
  ] as const)("%s → %s", (_label, iso, expected) => {
    expect(classifyFollowUp(iso, NOW)).toBe(expected);
  });

  it("uses the local calendar day, not the UTC one", () => {
    // 00:30 local on the 14th is still the 13th in UTC (19:00Z) — it is *not* today locally.
    const afterLocalMidnight = "2026-10-13T19:00:00.000Z";
    expect(classifyFollowUp(afterLocalMidnight, NOW)).toBe("upcoming");
  });
});

describe("isFollowUpDue", () => {
  it("is true only for overdue and today", () => {
    expect(isFollowUpDue("overdue")).toBe(true);
    expect(isFollowUpDue("today")).toBe(true);
    expect(isFollowUpDue("upcoming")).toBe(false);
    expect(isFollowUpDue("none")).toBe(false);
  });
});

describe("partitionLeads", () => {
  const leads = [
    lead({ id: 1, last_activity_at: local(2026, 10, 10) }),
    lead({ id: 2, next_follow_up_at: local(2026, 10, 13, 23, 0) }), // today
    lead({ id: 3, next_follow_up_at: local(2026, 10, 10, 9, 0) }), // overdue (3 days)
    lead({
      id: 4,
      next_follow_up_at: local(2026, 10, 16, 9, 0),
      last_activity_at: local(2026, 10, 12),
    }), // upcoming
    lead({ id: 5, next_follow_up_at: local(2026, 10, 12, 9, 0) }), // overdue (1 day)
    lead({ id: 6, last_activity_at: local(2026, 10, 13, 20, 0) }),
  ];

  it("pins overdue and today's follow-ups, most urgent first", () => {
    const { pinned } = partitionLeads(leads, NOW);
    expect(pinned.map((l) => l.id)).toEqual([3, 5, 2]);
  });

  it("lists everything else by most recent activity", () => {
    const { others } = partitionLeads(leads, NOW);
    expect(others.map((l) => l.id)).toEqual([6, 4, 1]);
  });

  it("does not mutate its input", () => {
    const ids = leads.map((l) => l.id);
    partitionLeads(leads, NOW);
    expect(leads.map((l) => l.id)).toEqual(ids);
  });
});
