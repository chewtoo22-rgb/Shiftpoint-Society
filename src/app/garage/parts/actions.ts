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

export type InstalledPartFormValues = {
  brand: string;
  name: string;
  category: string;
  partNumber: string;
  notes: string;
};

export type InstalledPartActionState = {
  error: string | null;
  success?: boolean;
  values?: InstalledPartFormValues;
};

const INVALID_INSTALLED_PART_MESSAGE =
  "Check the part details. Brand is required, part name and category must be at least 2 characters, and all fields must stay within their limits.";

function submittedValues(formData: FormData): InstalledPartFormValues {
  const bounded = (name: string, maxLength: number) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.slice(0, maxLength) : "";
  };

  return {
    brand: bounded("brand", 80),
    name: bounded("name", 140),
    category: bounded("category", 80),
    partNumber: bounded("partNumber", 80),
    notes: bounded("notes", 500),
  };
}

export async function addInstalledPart(
  _previousState: InstalledPartActionState,
  formData: FormData,
): Promise<InstalledPartActionState> {
  const parsed = installedPartSchema.safeParse({
    carId: formData.get("carId"),
    brand: formData.get("brand"),
    name: formData.get("name"),
    category: formData.get("category"),
    partNumber: formData.get("partNumber") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      error: INVALID_INSTALLED_PART_MESSAGE,
      values: submittedValues(formData),
    };
  }

  const input = parsed.data;
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

  return { error: null, success: true };
}
