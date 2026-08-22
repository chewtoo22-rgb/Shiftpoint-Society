import { db } from "./db";
import {
  POST_MEDIA_ORPHAN_GRACE_MS,
  isMemberPostMediaObjectKey,
  isPostMediaOrphanCandidate,
} from "./post-media-orphan-policy";

const DEFAULT_ORPHAN_CANDIDATE_LIMIT = 50;
const MAX_ORPHAN_CANDIDATE_LIMIT = 200;

export type PostMediaOrphanIntentRecord = {
  id: string;
  ownerId: string;
  objectKey: string;
  createdAt: Date;
  attachedAt: Date | null;
};

export type PostMediaOrphanIntentCandidate = {
  intentId: string;
  ownerId: string;
  objectKey: string;
  uploadedAt: Date;
};

export function selectPostMediaOrphanIntentCandidates(
  intents: PostMediaOrphanIntentRecord[],
  now = new Date(),
) {
  return intents.flatMap<PostMediaOrphanIntentCandidate>((intent) => {
    const candidate = {
      objectKey: intent.objectKey,
      ownerId: intent.ownerId,
      uploadedAt: intent.createdAt,
      attached: intent.attachedAt !== null,
    };

    if (!isPostMediaOrphanCandidate(candidate, now)) return [];
    if (!isMemberPostMediaObjectKey(intent.ownerId, intent.objectKey)) return [];

    return [
      {
        intentId: intent.id,
        ownerId: intent.ownerId,
        objectKey: intent.objectKey,
        uploadedAt: intent.createdAt,
      },
    ];
  });
}

/**
 * Reads cleanup candidates from server-issued upload intents only. This function
 * is deliberately non-destructive: it does not contact storage and does not
 * delete or mutate database records. A later cleanup executor can consume these
 * candidates only after an explicit storage deletion contract is defined.
 */
export async function findPostMediaOrphanIntentCandidates(options?: {
  now?: Date;
  limit?: number;
}) {
  const now = options?.now ?? new Date();
  const requestedLimit = options?.limit ?? DEFAULT_ORPHAN_CANDIDATE_LIMIT;
  const limit = Math.min(MAX_ORPHAN_CANDIDATE_LIMIT, Math.max(1, Math.floor(requestedLimit)));
  const cutoff = new Date(now.getTime() - POST_MEDIA_ORPHAN_GRACE_MS);

  const intents = await db.postMediaUploadIntent.findMany({
    where: {
      attachedAt: null,
      createdAt: { lte: cutoff },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      ownerId: true,
      objectKey: true,
      createdAt: true,
      attachedAt: true,
    },
  });

  return selectPostMediaOrphanIntentCandidates(intents, now);
}
