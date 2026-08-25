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

export type BuildUpdateFormValues = {
  title: string;
  body: string;
};

export type BuildUpdateFieldErrors = Partial<Record<keyof BuildUpdateFormValues, string[]>>;

export type BuildUpdateActionState = {
  error: string | null;
  success?: boolean;
  values?: BuildUpdateFormValues;
  fieldErrors?: BuildUpdateFieldErrors;
};

const INVALID_BUILD_UPDATE_MESSAGE =
  "Check the build update. Fix the highlighted fields and try again.";

const valueLimits: Record<keyof BuildUpdateFormValues, number> = {
  title: 120,
  body: 4000,
};

function submittedValues(formData: FormData): BuildUpdateFormValues {
  const read = (field: keyof BuildUpdateFormValues) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.slice(0, valueLimits[field]) : "";
  };

  return {
    title: read("title"),
    body: read("body"),
  };
}

function validationErrors(error: z.ZodError): BuildUpdateFieldErrors {
  const errors: BuildUpdateFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || !(field in valueLimits)) continue;

    const key = field as keyof BuildUpdateFormValues;
    const messages = errors[key] ?? [];
    messages.push(issue.message);
    errors[key] = messages;
  }

  return errors;
}

export async function addBuildUpdate(
  _previousState: BuildUpdateActionState,
  formData: FormData,
): Promise<BuildUpdateActionState> {
  const parsed = buildUpdateSchema.safeParse({
    carId: formData.get("carId"),
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return {
      error: INVALID_BUILD_UPDATE_MESSAGE,
      values: submittedValues(formData),
      fieldErrors: validationErrors(parsed.error),
    };
  }

  const input = parsed.data;
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

  return { error: null, success: true };
}
