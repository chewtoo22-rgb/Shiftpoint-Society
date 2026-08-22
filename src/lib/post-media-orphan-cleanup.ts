import type { PostMediaOrphanIntentCandidate } from "./post-media-orphan-repository";
import { isMemberPostMediaObjectKey } from "./post-media-orphan-policy";

export type PostMediaDeleteObjectRequest = {
  ownerId: string;
  objectKey: string;
};

/**
 * Provider-neutral contract for a future storage deletion implementation.
 * The cleanup executor below intentionally does not invoke this contract yet;
 * destructive cleanup remains disabled until a concrete adapter is reviewed
 * and verified independently.
 */
export interface PostMediaDeletionAdapter {
  deleteObject(request: PostMediaDeleteObjectRequest): Promise<void>;
}

export type PostMediaOrphanCleanupPlanItem = {
  intentId: string;
  ownerId: string;
  objectKey: string;
  uploadedAt: Date;
};

export type PostMediaOrphanCleanupResult = {
  dryRun: true;
  planned: PostMediaOrphanCleanupPlanItem[];
  deleted: [];
};

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
 * Produces a dry-run cleanup plan only. Live storage deletion is deliberately
 * unavailable in Phase 0 so an orphan-cleanup job cannot destroy objects until
 * the provider adapter, deletion semantics, and database reconciliation path
 * have their own green verification gate.
 */
export async function executePostMediaOrphanCleanup(options: {
  candidates: PostMediaOrphanIntentCandidate[];
  dryRun?: boolean;
  adapter?: PostMediaDeletionAdapter;
}): Promise<PostMediaOrphanCleanupResult> {
  if (options.dryRun === false) {
    throw new Error("Destructive post media cleanup is not enabled.");
  }

  const planned = planPostMediaOrphanCleanup(options.candidates);

  return {
    dryRun: true,
    planned,
    deleted: [],
  };
}
