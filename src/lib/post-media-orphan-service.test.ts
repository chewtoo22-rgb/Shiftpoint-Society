import { describe, expect, it, vi } from "vitest";
import type {
  PostMediaDeletionAdapter,
  PostMediaOrphanCleanupReconciler,
} from "./post-media-orphan-cleanup";
import { runPostMediaOrphanCleanup } from "./post-media-orphan-service";

const uploadedAt = new Date("2026-08-22T12:00:00.000Z");
const candidate = {
  intentId: "intent-1",
  ownerId: "member-1",
  objectKey: "members/member-1/post-media/upload_1.jpg",
  uploadedAt,
};

describe("runPostMediaOrphanCleanup", () => {
  it("defaults to a non-destructive dry run", async () => {
    const findCandidates = vi.fn(async () => [candidate]);
    const deleteObject = vi.fn(async () => undefined);
    const reconcileDeletedObject = vi.fn(async () => ({
      intentId: candidate.intentId,
      reconciled: true,
    }));

    await expect(
      runPostMediaOrphanCleanup(
        { deletionAdapter: { deleteObject } },
        {
          findCandidates,
          reconciler: { reconcileDeletedObject },
        },
      ),
    ).resolves.toEqual({
      dryRun: true,
      planned: [candidate],
      deleted: [],
      reconciled: [],
    });

    expect(findCandidates).toHaveBeenCalledOnce();
    expect(deleteObject).not.toHaveBeenCalled();
    expect(reconcileDeletedObject).not.toHaveBeenCalled();
  });

  it("forwards bounded candidate query options", async () => {
    const findCandidates = vi.fn(async () => []);
    const now = new Date("2026-08-22T14:00:00.000Z");

    await runPostMediaOrphanCleanup(
      { now, limit: 25 },
      { findCandidates },
    );

    expect(findCandidates).toHaveBeenCalledWith({ now, limit: 25 });
  });

  it("still requires the explicit destructive kill switch", async () => {
    const findCandidates = vi.fn(async () => [candidate]);
    const adapter: PostMediaDeletionAdapter = {
      deleteObject: vi.fn(async () => undefined),
    };

    await expect(
      runPostMediaOrphanCleanup(
        { dryRun: false, deletionAdapter: adapter },
        { findCandidates },
      ),
    ).rejects.toThrow("Destructive post media cleanup is not enabled.");
  });

  it("uses the supplied server deletion adapter and reconciler only after explicit enablement", async () => {
    const events: string[] = [];
    const findCandidates = vi.fn(async () => [candidate]);
    const adapter: PostMediaDeletionAdapter = {
      deleteObject: vi.fn(async ({ objectKey }) => {
        events.push(`delete:${objectKey}`);
      }),
    };
    const reconciler: PostMediaOrphanCleanupReconciler = {
      reconcileDeletedObject: vi.fn(async (item) => {
        events.push(`reconcile:${item.objectKey}`);
        return { intentId: item.intentId, reconciled: true };
      }),
    };

    await expect(
      runPostMediaOrphanCleanup(
        {
          dryRun: false,
          destructiveEnabled: true,
          deletionAdapter: adapter,
        },
        { findCandidates, reconciler },
      ),
    ).resolves.toEqual({
      dryRun: false,
      planned: [candidate],
      deleted: [candidate],
      reconciled: [candidate],
    });

    expect(events).toEqual([
      `delete:${candidate.objectKey}`,
      `reconcile:${candidate.objectKey}`,
    ]);
  });
});
