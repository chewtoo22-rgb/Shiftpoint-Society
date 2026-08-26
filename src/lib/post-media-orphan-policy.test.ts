import { describe, expect, it } from "vitest";
import {
  POST_MEDIA_ORPHAN_GRACE_MS,
  isMemberPostMediaObjectKey,
  isPostMediaOrphanCandidate,
} from "./post-media-orphan-policy";

describe("post media orphan policy", () => {
  const now = new Date("2026-08-22T12:00:00.000Z");

  it("marks old unattached uploads as cleanup candidates", () => {
    expect(
      isPostMediaOrphanCandidate(
        {
          objectKey: "members/member-1/post-media/token.jpg",
          ownerId: "member-1",
          uploadedAt: new Date(now.getTime() - POST_MEDIA_ORPHAN_GRACE_MS),
          attached: false,
        },
        now,
      ),
    ).toBe(true);
  });

  it("keeps recent or attached uploads out of cleanup", () => {
    expect(
      isPostMediaOrphanCandidate(
        {
          objectKey: "members/member-1/post-media/token.jpg",
          ownerId: "member-1",
          uploadedAt: new Date(now.getTime() - POST_MEDIA_ORPHAN_GRACE_MS + 1),
          attached: false,
        },
        now,
      ),
    ).toBe(false);

    expect(
      isPostMediaOrphanCandidate(
        {
          objectKey: "members/member-1/post-media/token.jpg",
          ownerId: "member-1",
          uploadedAt: new Date(now.getTime() - POST_MEDIA_ORPHAN_GRACE_MS * 2),
          attached: true,
        },
        now,
      ),
    ).toBe(false);
  });

  it("rejects future or invalid upload timestamps", () => {
    expect(
      isPostMediaOrphanCandidate(
        {
          objectKey: "members/member-1/post-media/token.jpg",
          ownerId: "member-1",
          uploadedAt: new Date(now.getTime() + 1),
          attached: false,
        },
        now,
      ),
    ).toBe(false);

    expect(
      isPostMediaOrphanCandidate(
        {
          objectKey: "members/member-1/post-media/token.jpg",
          ownerId: "member-1",
          uploadedAt: new Date("invalid"),
          attached: false,
        },
        now,
      ),
    ).toBe(false);
  });

  it("accepts only flat object keys in the authenticated member namespace", () => {
    expect(isMemberPostMediaObjectKey("member-1", "members/member-1/post-media/token_123.jpg")).toBe(true);
    expect(isMemberPostMediaObjectKey("member-1", "members/member-2/post-media/token.jpg")).toBe(false);
    expect(isMemberPostMediaObjectKey("member-1", "members/member-1/post-media/nested/token.jpg")).toBe(false);
    expect(isMemberPostMediaObjectKey("member-1", "members/member-1/post-media/../token.jpg")).toBe(false);
    expect(isMemberPostMediaObjectKey("", "members/member-1/post-media/token.jpg")).toBe(false);
  });
});
