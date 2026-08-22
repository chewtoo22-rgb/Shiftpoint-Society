import { db } from "@/lib/db";
import { getCurrentMember } from "@/lib/current-member";
import {
  validatePostMediaCandidate,
  type PostMediaCandidate,
} from "@/lib/post-media-policy";
import {
  assertOwnedPostMediaObjectKey,
  validatePostMediaPublicUrl,
} from "@/lib/post-media-completion-policy";

const MAX_MEDIA_PER_POST = 4;

export type AuthorizedPostMediaCompletion = {
  postId: string;
  ownerId: string;
  objectKey: string;
  mediaUrl: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "IMAGE" | "VIDEO";
};

/**
 * Final server-side authorization boundary before uploaded media can be
 * persisted against a post. The current member is resolved from the session,
 * the target post must belong to that member, the object key must live inside
 * the member namespace, and the object must match a server-issued upload
 * intent for that same member.
 */
export async function authorizePostMediaCompletion(input: {
  postId: string;
  objectKey: string;
  mediaUrl: string;
  media: PostMediaCandidate;
}): Promise<AuthorizedPostMediaCompletion> {
  const member = await getCurrentMember();
  const postId = input.postId.trim();

  if (!postId) {
    throw new Error("Post is required for media completion.");
  }

  const post = await db.post.findFirst({
    where: { id: postId, authorId: member.id },
    select: { id: true },
  });

  if (!post) {
    throw new Error("Post not found for current member.");
  }

  const media = validatePostMediaCandidate(input.media);
  const objectKey = assertOwnedPostMediaObjectKey(member.id, input.objectKey);
  const mediaUrl = validatePostMediaPublicUrl(input.mediaUrl);

  const intent = await db.postMediaUploadIntent.findUnique({
    where: { objectKey },
  });

  if (!intent || intent.ownerId !== member.id) {
    throw new Error("Upload intent not found for current member.");
  }

  if (
    intent.mediaUrl !== mediaUrl ||
    intent.type !== media.kind ||
    intent.mimeType !== media.mimeType ||
    intent.sizeBytes !== media.sizeBytes ||
    (intent.originalName ?? "") !== media.name
  ) {
    throw new Error("Uploaded media does not match its authorized upload intent.");
  }

  return {
    postId: post.id,
    ownerId: member.id,
    objectKey,
    mediaUrl,
    originalName: media.name,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    kind: media.kind,
  };
}

/**
 * Persists a completed upload only after the full authorization boundary above
 * succeeds. Repeated completion calls for the same storage object are
 * idempotent, while attempts to reuse an object key on a different post fail.
 * The matching upload intent is marked attached in the same transaction as the
 * media record so future cleanup cannot race a successful attachment.
 */
export async function persistPostMediaCompletion(input: {
  postId: string;
  objectKey: string;
  mediaUrl: string;
  media: PostMediaCandidate;
}) {
  const authorized = await authorizePostMediaCompletion(input);

  const existing = await db.postMedia.findUnique({
    where: { objectKey: authorized.objectKey },
  });

  if (existing) {
    if (existing.postId !== authorized.postId) {
      throw new Error("Uploaded media object is already attached to another post.");
    }

    await db.postMediaUploadIntent.update({
      where: { objectKey: authorized.objectKey },
      data: { attachedAt: new Date() },
    });

    return existing;
  }

  const mediaCount = await db.postMedia.count({
    where: { postId: authorized.postId },
  });

  if (mediaCount >= MAX_MEDIA_PER_POST) {
    throw new Error(`Posts support up to ${MAX_MEDIA_PER_POST} media attachments.`);
  }

  return db.$transaction(async (tx) => {
    const created = await tx.postMedia.create({
      data: {
        postId: authorized.postId,
        objectKey: authorized.objectKey,
        url: authorized.mediaUrl,
        type: authorized.kind,
        mimeType: authorized.mimeType,
        sizeBytes: authorized.sizeBytes,
        originalName: authorized.originalName,
        sortOrder: mediaCount,
      },
    });

    await tx.postMediaUploadIntent.update({
      where: { objectKey: authorized.objectKey },
      data: { attachedAt: new Date() },
    });

    return created;
  });
}
