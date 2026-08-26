import { db } from "./db";
import type { PostMediaOrphanCleanupPlanItem } from "./post-media-orphan-cleanup";
import { isMemberPostMediaObjectKey } from "./post-media-orphan-policy";

export type PostMediaOrphanReconciliationStore = {
  deleteUnattachedIntent(input: {
    intentId: string;
    ownerId: string;
    objectKey: string;
  }): Promise<number>;
};

const prismaReconciliationStore: PostMediaOrphanReconciliationStore = {
  async deleteUnattachedIntent(input) {
    const result = await db.postMediaUploadIntent.deleteMany({
      where: {
        id: input.intentId,
        ownerId: input.ownerId,
        objectKey: input.objectKey,
        attachedAt: null,
      },
    });

    return result.count;
  },
};

export type PostMediaOrphanReconciliationResult = {
  intentId: string;
  reconciled: boolean;
};

/**
 * Reconciles database state only after the storage provider has confirmed an
 * orphan object was deleted. The conditional delete is atomic and idempotent:
 * retries succeed as a no-op once the intent is already gone, and an intent
 * that became attached is never removed.
 */
export async function reconcileDeletedPostMediaOrphan(
  item: PostMediaOrphanCleanupPlanItem,
  store: PostMediaOrphanReconciliationStore = prismaReconciliationStore,
): Promise<PostMediaOrphanReconciliationResult> {
  if (!isMemberPostMediaObjectKey(item.ownerId, item.objectKey)) {
    throw new Error("Post media orphan reconciliation rejected an invalid object key.");
  }

  const deletedCount = await store.deleteUnattachedIntent({
    intentId: item.intentId,
    ownerId: item.ownerId,
    objectKey: item.objectKey,
  });

  if (deletedCount > 1) {
    throw new Error("Post media orphan reconciliation affected multiple upload intents.");
  }

  return {
    intentId: item.intentId,
    reconciled: deletedCount === 1,
  };
}
