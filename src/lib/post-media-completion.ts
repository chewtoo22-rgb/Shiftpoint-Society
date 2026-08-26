import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentMember } from "@/lib/current-member";
import {
  validatePostMediaCandidate,
  type PostMediaCandidate,
} from "./post-media-policy";
import {
  assertOwnedPostMediaObjectKey,
  validatePostMediaPublicUrl,
} from "./post-media-completion-policy";

const MAX_MEDIA_PER_POST = 4;
const MEDIA_SLOT_TRANSACTION_ATTEMPTS = 3;

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

type UploadIntentSnapshot = {
  ownerId: string;
  mediaUrl: string;
  type: "IMAGE" | "VIDEO";
  mimeType: string;
  sizeBytes: number;
  originalName: string | null;
};

function assertUploadIntentMatches(
  intent: UploadIntentSnapshot | null,
  expected: Pick<
    AuthorizedPostMediaCompletion,
    "ownerId" | "mediaUrl" | "kind" | "mimeType" | "sizeBytes" | "originalName"
  >,
) {
  if (!intent || intent.ownerId !== expected.ownerId) {
    throw new Error("Upload intent not found for current member.");
  }

  if (
    intent.mediaUrl !== expected.mediaUrl ||
    intent.type !== expected.kind ||
    intent.mimeType !== expected.mimeType ||
    intent.sizeBytes !== expected.sizeBytes ||
    (intent.originalName ?? "") !== expected.originalName
  ) {
    throw new Error("Uploaded media does not match its authorized upload intent.");
  }
}

type ExistingPostMediaSnapshot = {
  postId: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  mimeType: string;
  sizeBytes: number;
  originalName: string | null;
};

function assertExistingPostMediaMatches(
  existing: ExistingPostMediaSnapshot,
  authorized: AuthorizedPostMediaCompletion,
) {
  if (existing.postId !== authorized.postId) {
    throw new Error("Uploaded media object is already attached to another post.");
  }

  if (
    existing.url !== authorized.mediaUrl ||
    existing.type !== authorized.kind ||
    existing.mimeType !== authorized.mimeType ||
    existing.sizeBytes !== authorized.sizeBytes ||
    (existing.originalName ?? "") !== authorized.originalName
  ) {
    throw new Error("Existing post media does not match its authorized upload intent.");
  }
}

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

  assertUploadIntentMatches(intent, {
    ownerId: member.id,
    mediaUrl,
    kind: media.kind,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    originalName: media.name,
  });

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

function isSerializableWriteConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
  );
}

function firstFreeMediaSlot(sortOrders: number[]) {
  const occupied = new Set<number>();

  for (const sortOrder of sortOrders) {
    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder >= MAX_MEDIA_PER_POST
    ) {
      throw new Error("Post media slot state is invalid.");
    }

    if (occupied.has(sortOrder)) {
      throw new Error("Post media slot state contains duplicate positions.");
    }

    occupied.add(sortOrder);
  }

  for (let slot = 0; slot < MAX_MEDIA_PER_POST; slot += 1) {
    if (!occupied.has(slot)) {
      return slot;
    }
  }

  return null;
}

/**
 * Persists a completed upload only after the full authorization boundary above
 * succeeds. Repeated completion calls for the same storage object are
 * idempotent only when the already-persisted row still matches the signed
 * upload intent; inconsistent rows fail closed rather than being silently
 * accepted. Attempts to reuse an object key on a different post also fail.
 *
 * Slot assignment, upload-intent revalidation, and the four-attachment cap are
 * evaluated inside a SERIALIZABLE transaction. Re-reading the upload intent in
 * the same transaction closes the authorization-to-persistence TOCTOU window:
 * a stale/replaced intent cannot be marked attached after the outer admission
 * check. Slot selection uses the first free logical slot rather than the
 * attachment count so a removed middle attachment cannot make a later upload
 * collide with an existing sortOrder. Existing slot state must itself be valid
 * and unique; corrupt or duplicate persisted positions fail closed instead of
 * being silently ignored while a new attachment is created. PostgreSQL/Prisma
 * may surface a P2034 serialization conflict under contention, so retry the
 * whole bounded transaction a small number of times. The matching upload
 * intent is marked attached in the same transaction as the media record so
 * cleanup cannot race a successful attachment.
 */
export async function persistPostMediaCompletion(input: {
  postId: string;
  objectKey: string;
  mediaUrl: string;
  media: PostMediaCandidate;
}) {
  const authorized = await authorizePostMediaCompletion(input);

  for (let attempt = 1; attempt <= MEDIA_SLOT_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const intent = await tx.postMediaUploadIntent.findUnique({
            where: { objectKey: authorized.objectKey },
          });

          assertUploadIntentMatches(intent, authorized);

          const existing = await tx.postMedia.findUnique({
            where: { objectKey: authorized.objectKey },
          });

          if (existing) {
            assertExistingPostMediaMatches(existing, authorized);

            await tx.postMediaUploadIntent.update({
              where: { objectKey: authorized.objectKey },
              data: { attachedAt: new Date() },
            });

            return existing;
          }

          const mediaSlots = await tx.postMedia.findMany({
            where: { postId: authorized.postId },
            select: { sortOrder: true },
          });
          const sortOrder = firstFreeMediaSlot(
            mediaSlots.map((item) => item.sortOrder),
          );

          if (sortOrder === null) {
            throw new Error(
              `Posts support up to ${MAX_MEDIA_PER_POST} media attachments.`,
            );
          }

          const created = await tx.postMedia.create({
            data: {
              postId: authorized.postId,
              objectKey: authorized.objectKey,
              url: authorized.mediaUrl,
              type: authorized.kind,
              mimeType: authorized.mimeType,
              sizeBytes: authorized.sizeBytes,
              originalName: authorized.originalName,
              sortOrder,
            },
          });

          await tx.postMediaUploadIntent.update({
            where: { objectKey: authorized.objectKey },
            data: { attachedAt: new Date() },
          });

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        attempt < MEDIA_SLOT_TRANSACTION_ATTEMPTS &&
        isSerializableWriteConflict(error)
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Media completion transaction retry budget exhausted.");
}
