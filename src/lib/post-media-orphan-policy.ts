export const POST_MEDIA_ORPHAN_GRACE_MS = 60 * 60 * 1000;

export type PostMediaOrphanCandidate = {
  objectKey: string;
  ownerId: string;
  uploadedAt: Date;
  attached: boolean;
};

/**
 * Pure policy for deciding whether an uploaded post-media object is old enough
 * to be considered for cleanup. This function never deletes anything; storage
 * deletion remains a separate, explicit provider concern.
 */
export function isPostMediaOrphanCandidate(
  candidate: PostMediaOrphanCandidate,
  now = new Date(),
) {
  if (candidate.attached) return false;
  if (!Number.isFinite(candidate.uploadedAt.getTime())) return false;
  if (candidate.uploadedAt.getTime() > now.getTime()) return false;

  return now.getTime() - candidate.uploadedAt.getTime() >= POST_MEDIA_ORPHAN_GRACE_MS;
}

/**
 * Ensure an object key belongs to the authenticated member namespace before it
 * can ever be handed to a future cleanup adapter. This does not trust a client
 * supplied owner id and is intentionally side-effect free.
 */
export function isMemberPostMediaObjectKey(ownerId: string, objectKey: string) {
  const safeOwnerId = ownerId.trim();
  if (!safeOwnerId) return false;

  const prefix = `members/${encodeURIComponent(safeOwnerId)}/post-media/`;
  if (!objectKey.startsWith(prefix)) return false;

  const suffix = objectKey.slice(prefix.length);
  if (!suffix || suffix.includes("/") || suffix.includes("..")) return false;

  return /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(suffix);
}
