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

export type BuildUpdateActionState = {
  error: string | null;
  success?: boolean;
  values?: BuildUpdateFormValues;
};

const INVALID_BUILD_UPDATE_MESSAGE =
  "Check the build update. Title and details must each be at least 3 characters and stay within their limits.";

function submittedValues(formData: FormData): BuildUpdateFormValues {
  const title = formData.get("title");
  const body = formData.get("body");

  return {
    title: typeof title === "string" ? title.slice(0, 120) : "",
    body: typeof body === "string" ? body.slice(0, 4000) : "",
  };
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
