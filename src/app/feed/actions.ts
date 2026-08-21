"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentMember, requireOwnedCar } from "@/lib/current-member";

const postSchema = z.object({
  body: z.string().trim().min(1, "Say something first.").max(1200),
  carId: z.string().trim().optional(),
  kind: z.enum(["GENERAL", "PULL", "DYNO", "INSTALL", "QUESTION", "VIDEO", "EVENT"]),
});

const commentSchema = z.object({
  postId: z.string().trim().min(1),
  body: z.string().trim().min(1, "Write a comment first.").max(600),
});

const reactionSchema = z.object({
  postId: z.string().trim().min(1),
  type: z.enum(["LIKE", "FIRE", "WRENCH", "RESPECT"]),
});

export async function createFeedPost(formData: FormData) {
  const member = await getCurrentMember();
  const parsed = postSchema.safeParse({
    body: formData.get("body"),
    carId: formData.get("carId") || undefined,
    kind: formData.get("kind") || "GENERAL",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid post");
  }

  let carId: string | undefined;
  if (parsed.data.carId) {
    const owned = await requireOwnedCar(parsed.data.carId);
    carId = owned.car.id;
  }

  await db.post.create({
    data: {
      authorId: member.id,
      carId,
      body: parsed.data.body,
      kind: parsed.data.kind,
    },
  });

  revalidatePath("/feed");
}

export async function addFeedComment(formData: FormData) {
  const member = await getCurrentMember();
  const parsed = commentSchema.safeParse({
    postId: formData.get("postId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid comment");
  }

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
}

export async function toggleFeedReaction(formData: FormData) {
  const member = await getCurrentMember();
  const parsed = reactionSchema.safeParse({
    postId: formData.get("postId"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid reaction");
  }

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
    await db.reaction.delete({ where: key });
  } else {
    await db.reaction.create({
      data: {
        postId: post.id,
        userId: member.id,
        type: parsed.data.type,
      },
    });
  }

  revalidatePath("/feed");
}
