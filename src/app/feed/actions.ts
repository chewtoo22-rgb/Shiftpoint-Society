"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentMember, requireOwnedCar } from "@/lib/current-member";

const postSchema = z.object({
  body: z.string().trim().min(1, "Say something first.").max(1200),
  carId: z.string().trim().optional(),
});

export async function createFeedPost(formData: FormData) {
  const member = await getCurrentMember();
  const parsed = postSchema.safeParse({
    body: formData.get("body"),
    carId: formData.get("carId") || undefined,
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
      kind: "GENERAL",
    },
  });

  revalidatePath("/feed");
}
