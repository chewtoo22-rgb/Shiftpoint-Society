import { describe, expect, it, vi } from "vitest";
import {
  executePostMediaOrphanCleanup,
  planPostMediaOrphanCleanup,
  type PostMediaDeletionAdapter,
} from "./post-media-orphan-cleanup";

const uploadedAt = new Date("2026-08-22T12:00:00.000Z");

const candidate = {
  intentId: "intent-1",
  ownerId: "member-1",
  objectKey: "members/member-1/post-media/upload_1.jpg",
  uploadedAt,
};

describe("planPostMediaOrphanCleanup", () => {
  it("keeps only candidates in the matching member namespace", () => {
    expect(
      planPostMediaOrphanCleanup([
        candidate,
        { ...candidate, intentId: "intent-2", objectKey: "members/member-2/post-media/upload_2.jpg" },
        { ...candidate, intentId: "intent-3", objectKey: "members/member-1/post-media/nested/upload_3.jpg" },
      ]),
    ).toEqual([candidate]);
  });
});

describe("executePostMediaOrphanCleanup", () => {
  it("returns a dry-run plan without deleting storage objects", async () => {
    const deleteObject = vi.fn(async () => undefined);
    const adapter: PostMediaDeletionAdapter = { deleteObject };

    await expect(
      executePostMediaOrphanCleanup({ candidates: [candidate], adapter }),
    ).resolves.toEqual({
      dryRun: true,
      planned: [candidate],
      deleted: [],
    });

    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("rejects attempts to enable destructive cleanup", async () => {
    await expect(
      executePostMediaOrphanCleanup({ candidates: [candidate], dryRun: false }),
    ).rejects.toThrow("Destructive post media cleanup is not enabled.");
  });
});
