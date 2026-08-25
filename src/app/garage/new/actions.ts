"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentMember } from "@/lib/current-member";

const carSchema = z.object({
  year: z.coerce.number().int().min(1886).max(new Date().getFullYear() + 1),
  make: z.string().trim().min(2).max(80),
  model: z.string().trim().min(1).max(80),
  trim: z.string().trim().max(80).optional(),
  nickname: z.string().trim().max(80).optional(),
  engine: z.string().trim().max(120).optional(),
  drivetrain: z.string().trim().max(80).optional(),
  powerHp: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.coerce.number().int().positive().max(5000).optional(),
  ),
});

export type GarageCarActionState = {
  error: string | null;
};

const INVALID_CAR_MESSAGE =
  "Check the machine details. Year, make, model, and power must stay within the allowed ranges.";

export async function createGarageCar(
  _previousState: GarageCarActionState,
  formData: FormData,
): Promise<GarageCarActionState> {
  const parsed = carSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: INVALID_CAR_MESSAGE };
  }

  const input = parsed.data;
  const owner = await getCurrentMember();

  await db.car.create({
    data: {
      ownerId: owner.id,
      year: input.year,
      make: input.make,
      model: input.model,
      trim: input.trim || null,
      nickname: input.nickname || null,
      engine: input.engine || null,
      drivetrain: input.drivetrain || null,
      powerHp: input.powerHp,
    },
  });

  revalidatePath("/garage");
  revalidatePath(`/u/${owner.handle}`);
  redirect("/garage");
}
