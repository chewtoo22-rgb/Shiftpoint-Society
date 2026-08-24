"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwnedCar } from "@/lib/current-member";

const buildUpdateSchema = z.object({
  carId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(4000),
});

export async function addBuildUpdate(formData: FormData) {
  const input = buildUpdateSchema.parse({
    carId: formData.get("carId"),
    title: formData.get("title"),
    body: formData.get("body"),
  });

  const { member } = await requireOwnedCar(input.carId);

  await db.buildEntry.create({
    data: {
      carId: input.carId,
      title: input.title,
      body: input.body,
    },
  });

  revalidatePath("/garage");
  revalidatePath(`/u/${member.handle}`);
  revalidatePath(`/u/${member.handle}/cars/${input.carId}`);
}
