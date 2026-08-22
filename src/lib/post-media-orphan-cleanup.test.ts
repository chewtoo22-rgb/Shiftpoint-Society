import { describe, expect, it, vi } from "vitest";
import {
  executePostMediaOrphanCleanup,
  planPostMediaOrphanCleanup,
  type PostMediaDeletionAdapter,
  type PostMediaOrphanCleanupReconciler,
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
  it("returns a dry-run plan without deleting or reconciling", async () => {
    const deleteObject = vi.fn(async () => undefined);
    const reconcileDeletedObject = vi.fn(async () => ({ intentId: candidate.intentId, reconciled: true }));
    const adapter: PostMediaDeletionAdapter = { deleteObject };
    const reconciler: PostMediaOrphanCleanupReconciler = { reconcileDeletedObject };

    await expect(
      executePostMediaOrphanCleanup({ candidates: [candidate], adapter, reconciler }),
    ).resolves.toEqual({
      dryRun: true,
      planned: [candidate],
      deleted: [],
      reconciled: [],
    });

    expect(deleteObject).not.toHaveBeenCalled();
    expect(reconcileDeletedObject).not.toHaveBeenCalled();
  });

  it("rejects destructive cleanup unless explicitly enabled", async () => {
    await expect(
      executePostMediaOrphanCleanup({ candidates: [candidate], dryRun: false }),
    ).rejects.toThrow("Destructive post media cleanup is not enabled.");
  });

  it("requires both adapters when destructive cleanup is enabled", async () => {
    await expect(
      executePostMediaOrphanCleanup({
        candidates: [candidate],
        dryRun: false,
        destructiveEnabled: true,
      }),
    ).rejects.toThrow("requires deletion and reconciliation adapters");
  });

  it("deletes before reconciling each candidate", async () => {
    const events: string[] = [];
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
      executePostMediaOrphanCleanup({
        candidates: [candidate],
        dryRun: false,
        destructiveEnabled: true,
        adapter,
        reconciler,
      }),
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

  it("does not reconcile when provider deletion fails", async () => {
    const adapter: PostMediaDeletionAdapter = {
      deleteObject: vi.fn(async () => {
        throw new Error("provider down");
      }),
    };
    const reconcileDeletedObject = vi.fn(async () => ({ intentId: candidate.intentId, reconciled: true }));
    const reconciler: PostMediaOrphanCleanupReconciler = { reconcileDeletedObject };

    await expect(
      executePostMediaOrphanCleanup({
        candidates: [candidate],
        dryRun: false,
        destructiveEnabled: true,
        adapter,
        reconciler,
      }),
    ).rejects.toThrow("provider down");

    expect(reconcileDeletedObject).not.toHaveBeenCalled();
  });

  it("fails closed on a mismatched reconciliation result", async () => {
    const adapter: PostMediaDeletionAdapter = { deleteObject: vi.fn(async () => undefined) };
    const reconciler: PostMediaOrphanCleanupReconciler = {
      reconcileDeletedObject: vi.fn(async () => ({ intentId: "other-intent", reconciled: true })),
    };

    await expect(
      executePostMediaOrphanCleanup({
        candidates: [candidate],
        dryRun: false,
        destructiveEnabled: true,
        adapter,
        reconciler,
      }),
    ).rejects.toThrow("mismatched intent");
  });
});
