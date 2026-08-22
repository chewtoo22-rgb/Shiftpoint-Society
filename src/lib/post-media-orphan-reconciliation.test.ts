import { describe, expect, it, vi } from "vitest";
import {
  reconcileDeletedPostMediaOrphan,
  type PostMediaOrphanReconciliationStore,
} from "./post-media-orphan-reconciliation";

const item = {
  intentId: "intent_1",
  ownerId: "member_1",
  objectKey: "members/member_1/post-media/upload_1.jpg",
  uploadedAt: new Date("2026-08-22T00:00:00.000Z"),
};

describe("reconcileDeletedPostMediaOrphan", () => {
  it("removes the exact unattached upload intent after provider deletion", async () => {
    const deleteUnattachedIntent = vi.fn(async () => 1);
    const store: PostMediaOrphanReconciliationStore = { deleteUnattachedIntent };

    await expect(reconcileDeletedPostMediaOrphan(item, store)).resolves.toEqual({
      intentId: "intent_1",
      reconciled: true,
    });

    expect(deleteUnattachedIntent).toHaveBeenCalledWith({
      intentId: "intent_1",
      ownerId: "member_1",
      objectKey: "members/member_1/post-media/upload_1.jpg",
    });
  });

  it("is idempotent when the intent is already gone or no longer unattached", async () => {
    const store: PostMediaOrphanReconciliationStore = {
      deleteUnattachedIntent: vi.fn(async () => 0),
    };

    await expect(reconcileDeletedPostMediaOrphan(item, store)).resolves.toEqual({
      intentId: "intent_1",
      reconciled: false,
    });
  });

  it("rejects cross-member object keys before touching the store", async () => {
    const deleteUnattachedIntent = vi.fn(async () => 1);
    const store: PostMediaOrphanReconciliationStore = { deleteUnattachedIntent };

    await expect(
      reconcileDeletedPostMediaOrphan(
        {
          ...item,
          objectKey: "members/member_2/post-media/upload_1.jpg",
        },
        store,
      ),
    ).rejects.toThrow("invalid object key");

    expect(deleteUnattachedIntent).not.toHaveBeenCalled();
  });

  it("fails closed if a reconciliation store reports multiple affected rows", async () => {
    const store: PostMediaOrphanReconciliationStore = {
      deleteUnattachedIntent: vi.fn(async () => 2),
    };

    await expect(reconcileDeletedPostMediaOrphan(item, store)).rejects.toThrow(
      "affected multiple upload intents",
    );
  });
});
