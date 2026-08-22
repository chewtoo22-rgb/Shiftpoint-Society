import { describe, expect, it } from "vitest";
import { selectPostMediaOrphanIntentCandidates } from "./post-media-orphan-repository";
import { POST_MEDIA_ORPHAN_GRACE_MS } from "./post-media-orphan-policy";

const NOW = new Date("2026-08-22T14:00:00.000Z");

function intent(overrides: Partial<{
  id: string;
  ownerId: string;
  objectKey: string;
  createdAt: Date;
  attachedAt: Date | null;
}> = {}) {
  return {
    id: "intent-1",
    ownerId: "member-1",
    objectKey: "members/member-1/post-media/upload_1.jpg",
    createdAt: new Date(NOW.getTime() - POST_MEDIA_ORPHAN_GRACE_MS),
    attachedAt: null,
    ...overrides,
  };
}

describe("selectPostMediaOrphanIntentCandidates", () => {
  it("returns stale unattached intents in the matching member namespace", () => {
    expect(selectPostMediaOrphanIntentCandidates([intent()], NOW)).toEqual([
      {
        intentId: "intent-1",
        ownerId: "member-1",
        objectKey: "members/member-1/post-media/upload_1.jpg",
        uploadedAt: new Date(NOW.getTime() - POST_MEDIA_ORPHAN_GRACE_MS),
      },
    ]);
  });

  it("rejects attached and too-recent intents", () => {
    const attached = intent({ attachedAt: new Date(NOW.getTime() - 1_000) });
    const recent = intent({
      id: "intent-2",
      objectKey: "members/member-1/post-media/upload_2.jpg",
      createdAt: new Date(NOW.getTime() - POST_MEDIA_ORPHAN_GRACE_MS + 1),
    });

    expect(selectPostMediaOrphanIntentCandidates([attached, recent], NOW)).toEqual([]);
  });

  it("rejects cross-member and malformed object keys", () => {
    const crossMember = intent({ objectKey: "members/member-2/post-media/upload_1.jpg" });
    const nested = intent({ objectKey: "members/member-1/post-media/nested/upload_1.jpg" });
    const traversal = intent({ objectKey: "members/member-1/post-media/../upload_1.jpg" });

    expect(
      selectPostMediaOrphanIntentCandidates([crossMember, nested, traversal], NOW),
    ).toEqual([]);
  });
});
