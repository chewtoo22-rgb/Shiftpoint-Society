import type { PostMediaOrphanIntentCandidate } from "./post-media-orphan-repository";
import { isMemberPostMediaObjectKey } from "./post-media-orphan-policy";

export type PostMediaDeleteObjectRequest = {
  ownerId: string;
  objectKey: string;
};

/** Provider-neutral storage deletion contract. */
export interface PostMediaDeletionAdapter {
  deleteObject(request: PostMediaDeleteObjectRequest): Promise<void>;
}

export type PostMediaOrphanCleanupPlanItem = {
  intentId: string;
  ownerId: string;
  objectKey: string;
  uploadedAt: Date;
};

export interface PostMediaOrphanCleanupReconciler {
  reconcileDeletedObject(item: PostMediaOrphanCleanupPlanItem): Promise<{
    intentId: string;
    reconciled: boolean;
  }>;
}

export type PostMediaOrphanDryRunCleanupResult = {
  dryRun: true;
  planned: PostMediaOrphanCleanupPlanItem[];
  deleted: [];
  reconciled: [];
};

export type PostMediaOrphanDestructiveCleanupResult = {
  dryRun: false;
  planned: PostMediaOrphanCleanupPlanItem[];
  deleted: PostMediaOrphanCleanupPlanItem[];
  reconciled: PostMediaOrphanCleanupPlanItem[];
};

export type PostMediaOrphanCleanupResult =
  | PostMediaOrphanDryRunCleanupResult
  | PostMediaOrphanDestructiveCleanupResult;

export function planPostMediaOrphanCleanup(
  candidates: PostMediaOrphanIntentCandidate[],
): PostMediaOrphanCleanupPlanItem[] {
  return candidates.flatMap((candidate) => {
    if (!isMemberPostMediaObjectKey(candidate.ownerId, candidate.objectKey)) return [];

    return [
      {
        intentId: candidate.intentId,
        ownerId: candidate.ownerId,
        objectKey: candidate.objectKey,
        uploadedAt: candidate.uploadedAt,
      },
    ];
  });
}

/**
 * Executes orphan cleanup with a fail-closed destructive gate.
 *
 * Dry-run remains the default and never calls storage or reconciliation. A live
 * run requires all three explicit inputs: dryRun=false, destructiveEnabled=true,
 * and concrete deletion + reconciliation implementations. Merely configuring a
 * provider endpoint cannot enable deletion.
 *
 * For each item the order is strict: provider delete must resolve first, then
 * database reconciliation runs. If deletion fails, reconciliation is skipped.
 * If reconciliation fails after a confirmed provider delete, the error is
 * surfaced so a later idempotent retry can reconcile the still-unattached intent.
 */
export async function executePostMediaOrphanCleanup(options: {
  candidates: PostMediaOrphanIntentCandidate[];
  dryRun?: boolean;
  destructiveEnabled?: boolean;
  adapter?: PostMediaDeletionAdapter;
  reconciler?: PostMediaOrphanCleanupReconciler;
}): Promise<PostMediaOrphanCleanupResult> {
  const planned = planPostMediaOrphanCleanup(options.candidates);

  if (options.dryRun !== false) {
    return {
      dryRun: true,
      planned,
      deleted: [],
      reconciled: [],
    };
  }

  if (options.destructiveEnabled !== true) {
    throw new Error("Destructive post media cleanup is not enabled.");
  }

  if (!options.adapter || !options.reconciler) {
    throw new Error("Destructive post media cleanup requires deletion and reconciliation adapters.");
  }

  const deleted: PostMediaOrphanCleanupPlanItem[] = [];
  const reconciled: PostMediaOrphanCleanupPlanItem[] = [];

  for (const item of planned) {
    await options.adapter.deleteObject({
      ownerId: item.ownerId,
      objectKey: item.objectKey,
    });
    deleted.push(item);

    const result = await options.reconciler.reconcileDeletedObject(item);
    if (result.intentId !== item.intentId) {
      throw new Error("Post media orphan cleanup reconciliation returned a mismatched intent.");
    }

    if (result.reconciled) reconciled.push(item);
  }

  return {
    dryRun: false,
    planned,
    deleted,
    reconciled,
  };
}
