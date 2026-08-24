"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwnedCar } from "@/lib/current-member";

const installedPartSchema = z.object({
  carId: z.string().min(1),
  brand: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(140),
  category: z.string().trim().min(2).max(80),
  partNumber: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function addInstalledPart(formData: FormData) {
  const input = installedPartSchema.parse({
    carId: formData.get("carId"),
    brand: formData.get("brand"),
    name: formData.get("name"),
    category: formData.get("category"),
    partNumber: formData.get("partNumber") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const { member } = await requireOwnedCar(input.carId);

  let part = await db.part.findFirst({
    where: {
      brand: input.brand,
      name: input.name,
      partNumber: input.partNumber || null,
    },
  });

  part ??= await db.part.create({
    data: {
      brand: input.brand,
      name: input.name,
      category: input.category,
      partNumber: input.partNumber || null,
    },
  });

  await db.carPart.upsert({
    where: { carId_partId: { carId: input.carId, partId: part.id } },
    update: { notes: input.notes || null, installedAt: new Date() },
    create: {
      carId: input.carId,
      partId: part.id,
      notes: input.notes || null,
      installedAt: new Date(),
    },
  });

  revalidatePath("/garage");
  revalidatePath(`/u/${member.handle}`);
  revalidatePath(`/u/${member.handle}/cars/${input.carId}`);
}
