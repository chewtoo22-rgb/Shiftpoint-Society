import { describe, expect, it } from "vitest";

import {
  MEMBER_ACTIVITY_DEFAULT_LIMIT,
  MEMBER_ACTIVITY_MAX_LIMIT,
  normalizeMemberActivityLimit,
} from "./activity-repository";

describe("normalizeMemberActivityLimit", () => {
  it("uses the release-safe default when no limit is supplied", () => {
    expect(normalizeMemberActivityLimit()).toBe(MEMBER_ACTIVITY_DEFAULT_LIMIT);
  });

  it("clamps oversized activity requests to the hard maximum", () => {
    expect(normalizeMemberActivityLimit(MEMBER_ACTIVITY_MAX_LIMIT + 500)).toBe(MEMBER_ACTIVITY_MAX_LIMIT);
  });

  it("keeps activity queries positive for zero or negative values", () => {
    expect(normalizeMemberActivityLimit(0)).toBe(1);
    expect(normalizeMemberActivityLimit(-20)).toBe(1);
  });

  it("normalizes fractional and non-finite values deterministically", () => {
    expect(normalizeMemberActivityLimit(12.9)).toBe(12);
    expect(normalizeMemberActivityLimit(Number.NaN)).toBe(MEMBER_ACTIVITY_DEFAULT_LIMIT);
    expect(normalizeMemberActivityLimit(Number.POSITIVE_INFINITY)).toBe(MEMBER_ACTIVITY_DEFAULT_LIMIT);
  });
});
