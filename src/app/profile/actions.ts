"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentMember } from "@/lib/current-member";
import { db } from "@/lib/db";

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

  try {
    const updated = await db.user.update({
      where: { id: member.id },
      data: {
        handle: parsed.data.handle,
        displayName: parsed.data.displayName,
        bio: parsed.data.bio ?? null,
      },
    });

    revalidatePath("/profile");
    revalidatePath(`/u/${member.handle}`);
    revalidatePath(`/u/${updated.handle}`);
    redirect("/garage/new");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("That Society handle is already taken");
    }
    throw error;
  }
}
