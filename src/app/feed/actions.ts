"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentMember, requireOwnedCar } from "@/lib/current-member";
import { persistPostMediaCompletion } from "@/lib/post-media-completion";
import {
  createPostMediaCompletionGrant,
  verifyPostMediaCompletionGrant,
} from "@/lib/post-media-completion-token";
import { createConfiguredPostMediaStorageAdapter } from "@/lib/post-media-http-storage";
import { POST_MEDIA_LIMITS, type PostMediaCandidate } from "@/lib/post-media-policy";
import { authorizePostMediaUploads } from "@/lib/post-media-upload";

const postSchema = z.object({
  body: z.string().trim().min(1, "Say something first.").max(1200),
  carId: z.string().trim().optional(),
  kind: z.enum(["GENERAL", "PULL", "DYNO", "INSTALL", "QUESTION", "VIDEO", "EVENT"]),
});

const commentSchema = z.object({
  postId: z.string().trim().min(1),
  body: z.string().trim().min(1, "Write a comment first.").max(600, "Keep comments to 600 characters."),
});

const reactionSchema = z.object({
  postId: z.string().trim().min(1),
  type: z.enum(["LIKE", "FIRE", "WRENCH", "RESPECT"]),
});

const postMediaCandidateSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1),
      mimeType: z.string().trim().min(1),
      sizeBytes: z.number().int().positive(),
    }),
  )
  .max(POST_MEDIA_LIMITS.maxFilesPerPost);

const postMediaCompletionSchema = z.object({
  postId: z.string().trim().min(1),
  completionToken: z.string().trim().min(1),
});

export type FeedCommentActionState = {
  error: string | null;
  success?: boolean;
  value?: string;
  fieldErrors?: {
    body?: string[];
  };
};

export async function createFeedPost(formData: FormData) {
  const parsed = postSchema.safeParse({
    body: formData.get("body"),
    carId: formData.get("carId") || undefined,
    kind: formData.get("kind") || "GENERAL",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid post");
  }

  const member = await getCurrentMember();
  let carId: string | undefined;
  if (parsed.data.carId) {
    const owned = await requireOwnedCar(parsed.data.carId);
    carId = owned.car.id;
  }

  const post = await db.post.create({
    data: {
      authorId: member.id,
      carId,
      body: parsed.data.body,
      kind: parsed.data.kind,
    },
    select: { id: true },
  });

  revalidatePath("/feed");

  return { id: post.id };
}

/**
 * HTML form-compatible wrapper. React form actions must resolve to void,
 * while createFeedPost intentionally returns the server-created post ID for
 * the richer composer upload flow.
 */
export async function createFeedPostFromForm(formData: FormData): Promise<void> {
  await createFeedPost(formData);
}

/**
 * Authenticated server boundary for initiating composer media uploads.
 * Clients submit file metadata only; member identity is resolved inside
 * authorizePostMediaUploads and is never accepted from the caller.
 * Each returned target carries a short-lived signed completion grant binding
 * the object key, public URL and validated media metadata to that authorization.
 */
export async function requestFeedPostMediaUploads(candidates: PostMediaCandidate[]) {
  const parsed = postMediaCandidateSchema.safeParse(candidates);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid media upload request");
  }

  const storage = createConfiguredPostMediaStorageAdapter();
  const uploads = await authorizePostMediaUploads(parsed.data, storage);

  return uploads.map((upload) => ({
    uploadUrl: upload.uploadUrl,
    mediaUrl: upload.mediaUrl,
    method: upload.method,
    headers: upload.headers,
    objectKey: upload.objectKey,
    originalName: upload.originalName,
    mimeType: upload.mimeType,
    sizeBytes: upload.sizeBytes,
    kind: upload.kind,
    completionToken: createPostMediaCompletionGrant({
      ownerId: upload.ownerId,
      objectKey: upload.objectKey,
      mediaUrl: upload.mediaUrl,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      kind: upload.kind,
    }),
  }));
}

/**
 * Authenticated completion boundary for composer uploads. The client submits
 * only the post id plus the signed grant returned at upload authorization.
 * Object key, public URL and media metadata are recovered from that grant,
 * then persistPostMediaCompletion re-resolves the member and verifies post and
 * object-key ownership before writing the idempotent PostMedia record.
 */
export async function completeFeedPostMediaUpload(input: {
  postId: string;
  completionToken: string;
}) {
  const parsed = postMediaCompletionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid media completion request");
  }

  const grant = verifyPostMediaCompletionGrant(parsed.data.completionToken);
  const media = await persistPostMediaCompletion({
    postId: parsed.data.postId,
    objectKey: grant.objectKey,
    mediaUrl: grant.mediaUrl,
    media: {
      name: grant.originalName,
      mimeType: grant.mimeType,
      sizeBytes: grant.sizeBytes,
    },
  });
  revalidatePath("/feed");
  revalidatePath(`/feed/${media.postId}`);

  return {
    id: media.id,
    postId: media.postId,
    url: media.url,
    type: media.type,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    originalName: media.originalName,
    sortOrder: media.sortOrder,
  };
}

export async function addFeedComment(formData: FormData) {
  const parsed = commentSchema.safeParse({
    postId: formData.get("postId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid comment");
  }

  const member = await getCurrentMember();
  const post = await db.post.findUnique({
    where: { id: parsed.data.postId },
    select: { id: true },
  });

  if (!post) throw new Error("Post not found");

  await db.comment.create({
    data: {
      postId: post.id,
      authorId: member.id,
      body: parsed.data.body,
    },
  });

  revalidatePath("/feed");
  revalidatePath(`/feed/${post.id}`);
}

export async function submitFeedComment(
  _previousState: FeedCommentActionState,
  formData: FormData,
): Promise<FeedCommentActionState> {
  const rawBody = String(formData.get("body") ?? "");
  const parsed = commentSchema.safeParse({
    postId: formData.get("postId"),
    body: rawBody,
  });

  if (!parsed.success) {
    return {
      error: "Fix the highlighted comment field and try again.",
      value: rawBody.slice(0, 600),
      fieldErrors: {
        body: parsed.error.flatten().fieldErrors.body,
      },
    };
  }

  try {
    await addFeedComment(formData);
    return { error: null, success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "Post not found") {
      return {
        error: "This post is no longer available. Refresh the feed before replying.",
        value: parsed.data.body,
      };
    }
    throw error;
  }
}

export async function toggleFeedReaction(formData: FormData) {
  const parsed = reactionSchema.safeParse({
    postId: formData.get("postId"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid reaction");
  }

  const member = await getCurrentMember();
  const post = await db.post.findUnique({
    where: { id: parsed.data.postId },
    select: { id: true },
  });

  if (!post) throw new Error("Post not found");

  const key = {
    postId_userId_type: {
      postId: post.id,
      userId: member.id,
      type: parsed.data.type,
    },
  } as const;

  const existing = await db.reaction.findUnique({ where: key });

  if (existing) {
    // deleteMany is intentionally idempotent. If two matching requests race
    // after both observing the same existing reaction, the second delete is a
    // harmless no-op instead of surfacing a record-not-found failure.
    await db.reaction.deleteMany({ where: key.postId_userId_type });
  } else {
    // Upsert closes the corresponding create race: duplicate fast taps can
    // both observe no row, but only one row is ever persisted and neither
    // request fails the unique(postId,userId,type) constraint.
    await db.reaction.upsert({
      where: key,
      create: {
        postId: post.id,
        userId: member.id,
        type: parsed.data.type,
      },
      update: {},
    });
  }

  revalidatePath("/feed");
  revalidatePath(`/feed/${post.id}`);
}
