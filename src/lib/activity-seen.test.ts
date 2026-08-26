import { describe, expect, it } from "vitest";

import { getActivitySeenCookieName, parseActivitySeenAt } from "./activity-seen";

describe("activity seen state", () => {
  it("uses a stable opaque cookie key per member", () => {
    const first = getActivitySeenCookieName("member-123");
    const same = getActivitySeenCookieName("member-123");
    const other = getActivitySeenCookieName("member-456");

    expect(first).toBe(same);
    expect(first).not.toBe(other);
    expect(first).toMatch(/^shiftpoint-activity-seen-at-[a-f0-9]{24}$/);
    expect(first).not.toContain("member-123");
  });

  it("rejects missing member identity when deriving cookie scope", () => {
    expect(() => getActivitySeenCookieName("   ")).toThrow(/memberId is required/);
  });

  it("parses valid seen timestamps and rejects malformed values", () => {
    const now = Date.parse("2026-08-24T20:00:00.000Z");
    const seenAt = parseActivitySeenAt("2026-08-24T19:59:00.000Z", now);

    expect(seenAt?.toISOString()).toBe("2026-08-24T19:59:00.000Z");
    expect(parseActivitySeenAt(undefined, now)).toBeNull();
    expect(parseActivitySeenAt("not-a-date", now)).toBeNull();
  });

  it("rejects timestamps implausibly far in the future", () => {
    const now = Date.parse("2026-08-24T20:00:00.000Z");

    expect(parseActivitySeenAt("2026-08-24T20:04:59.000Z", now)).not.toBeNull();
    expect(parseActivitySeenAt("2026-08-24T20:05:01.000Z", now)).toBeNull();
  });
});
