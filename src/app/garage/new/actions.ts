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

export type GarageCarFormValues = {
  year: string;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  engine: string;
  drivetrain: string;
  powerHp: string;
};

export type GarageCarFieldErrors = Partial<Record<keyof GarageCarFormValues, string[]>>;

export type GarageCarActionState = {
  error: string | null;
  values?: GarageCarFormValues;
  fieldErrors?: GarageCarFieldErrors;
};

const INVALID_CAR_MESSAGE =
  "Check the machine details. Fix the highlighted fields and try again.";

const valueLimits: Record<keyof GarageCarFormValues, number> = {
  year: 4,
  make: 80,
  model: 80,
  trim: 80,
  nickname: 80,
  engine: 120,
  drivetrain: 80,
  powerHp: 4,
};

function submittedValues(formData: FormData): GarageCarFormValues {
  const read = (field: keyof GarageCarFormValues) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.slice(0, valueLimits[field]) : "";
  };

  return {
    year: read("year"),
    make: read("make"),
    model: read("model"),
    trim: read("trim"),
    nickname: read("nickname"),
    engine: read("engine"),
    drivetrain: read("drivetrain"),
    powerHp: read("powerHp"),
  };
}

function validationErrors(error: z.ZodError): GarageCarFieldErrors {
  const errors: GarageCarFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || !(field in valueLimits)) continue;

    const key = field as keyof GarageCarFormValues;
    const messages = errors[key] ?? [];
    messages.push(issue.message);
    errors[key] = messages;
  }

  return errors;
}

export async function createGarageCar(
  _previousState: GarageCarActionState,
  formData: FormData,
): Promise<GarageCarActionState> {
  const parsed = carSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: INVALID_CAR_MESSAGE,
      values: submittedValues(formData),
      fieldErrors: validationErrors(parsed.error),
    };
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
