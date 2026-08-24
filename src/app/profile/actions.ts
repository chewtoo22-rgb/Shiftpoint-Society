"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentMember } from "@/lib/current-member";
import { db } from "@/lib/db";
import { validateSocietyHandle } from "../../lib/society-handle";

const profileSchema = z.object({
  handle: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(280).optional(),
});

export async function updateMemberProfile(formData: FormData) {
  const member = await getCurrentMember();
  const parsed = profileSchema.safeParse({
    handle: formData.get("handle"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid Society profile details");
  }

  const handle = validateSocietyHandle(parsed.data.handle);

  try {
    const [updated, carCount] = await db.$transaction([
      db.user.update({
        where: { id: member.id },
        data: {
          handle,
          displayName: parsed.data.displayName,
          bio: parsed.data.bio ?? null,
        },
      }),
      db.car.count({ where: { ownerId: member.id } }),
    ]);

    revalidatePath("/profile");
    revalidatePath(`/u/${member.handle}`);
    revalidatePath(`/u/${updated.handle}`);
    redirect(carCount === 0 ? "/garage/new" : "/garage");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("That Society handle is already taken");
    }
    throw error;
  }
}
