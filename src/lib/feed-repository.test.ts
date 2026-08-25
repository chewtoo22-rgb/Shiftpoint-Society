import { describe, expect, it } from "vitest";

import {
  COMMUNITY_BUILD_ENTRY_ORDER,
  COMMUNITY_COMMENT_ORDER,
  COMMUNITY_FEED_DEFAULT_LIMIT,
  COMMUNITY_FEED_MAX_LIMIT,
  COMMUNITY_FEED_ORDER,
  buildCommunityFeedPostWhere,
  normalizeCommunityFeedLimit,
} from "./feed-repository";

describe("buildCommunityFeedPostWhere", () => {
  it("constrains the detail lookup to the requested post id", () => {
    expect(buildCommunityFeedPostWhere("post-123")).toEqual({ id: "post-123" });
  });

  it("does not add client-controlled ownership constraints to a public post lookup", () => {
    const where = buildCommunityFeedPostWhere("post-public");

    expect(Object.keys(where)).toEqual(["id"]);
    expect(where).not.toHaveProperty("authorId");
    expect(where).not.toHaveProperty("carId");
  });
});

describe("normalizeCommunityFeedLimit", () => {
  it("uses the release-safe default when no limit is supplied", () => {
    expect(normalizeCommunityFeedLimit()).toBe(COMMUNITY_FEED_DEFAULT_LIMIT);
  });

  it("clamps oversized feed requests to the hard maximum", () => {
    expect(normalizeCommunityFeedLimit(COMMUNITY_FEED_MAX_LIMIT + 500)).toBe(COMMUNITY_FEED_MAX_LIMIT);
  });

  it("keeps the query positive for zero or negative values", () => {
    expect(normalizeCommunityFeedLimit(0)).toBe(1);
    expect(normalizeCommunityFeedLimit(-20)).toBe(1);
  });

  it("normalizes fractional and non-finite values deterministically", () => {
    expect(normalizeCommunityFeedLimit(12.9)).toBe(12);
    expect(normalizeCommunityFeedLimit(Number.NaN)).toBe(COMMUNITY_FEED_DEFAULT_LIMIT);
    expect(normalizeCommunityFeedLimit(Number.POSITIVE_INFINITY)).toBe(COMMUNITY_FEED_DEFAULT_LIMIT);
  });
});

describe("community timeline ordering", () => {
  it("keeps feed cards stable when posts share the same timestamp", () => {
    expect(COMMUNITY_FEED_ORDER).toEqual([
      { createdAt: "desc" },
      { id: "asc" },
    ]);
  });

  it("keeps bounded comment previews stable when comments share a timestamp", () => {
    expect(COMMUNITY_COMMENT_ORDER).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ]);
  });

  it("keeps post-detail build previews stable when milestones share a timestamp", () => {
    expect(COMMUNITY_BUILD_ENTRY_ORDER).toEqual([
      { occurredAt: "desc" },
      { id: "asc" },
    ]);
  });
});
