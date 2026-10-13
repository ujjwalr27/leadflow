import { describe, expect, it } from "vitest";

import { formatDayAndTime, formatRelative, localInputsToIso } from "./time";

// Tests run in Asia/Kolkata (UTC+05:30) — see vitest.config.ts.
const NOW = new Date(2026, 9, 13, 21, 30);

describe("formatRelative", () => {
  it.each([
    [new Date(2026, 9, 13, 21, 29, 30), "just now"],
    [new Date(2026, 9, 13, 19, 30), "2 hours ago"],
    [new Date(2026, 9, 11, 21, 30), "2 days ago"],
    [new Date(2026, 9, 14, 0, 30), "in 3 hours"],
  ])("%s → %s", (date, expected) => {
    expect(formatRelative(date.toISOString(), NOW)).toBe(expected);
  });
});

describe("formatDayAndTime", () => {
  it("names today and tomorrow", () => {
    expect(formatDayAndTime(new Date(2026, 9, 13, 14, 0).toISOString(), NOW)).toBe(
      "today at 2:00 PM",
    );
    expect(formatDayAndTime(new Date(2026, 9, 14, 9, 0).toISOString(), NOW)).toBe(
      "tomorrow at 9:00 AM",
    );
  });

  it("uses the weekday and date further out", () => {
    expect(formatDayAndTime(new Date(2026, 9, 16, 9, 0).toISOString(), NOW)).toBe(
      "Fri, Oct 16 at 9:00 AM",
    );
  });
});

describe("localInputsToIso", () => {
  it("interprets the inputs in local time and returns UTC", () => {
    expect(localInputsToIso("2026-10-14", "09:30")).toBe("2026-10-14T04:00:00.000Z");
  });

  it("returns null when a part is missing or invalid", () => {
    expect(localInputsToIso("", "09:30")).toBeNull();
    expect(localInputsToIso("2026-10-14", "")).toBeNull();
    expect(localInputsToIso("not-a-date", "09:30")).toBeNull();
  });
});
