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
 * the target post must belong to that member, and the object key must live
 * inside the same member namespace used during upload authorization.
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
