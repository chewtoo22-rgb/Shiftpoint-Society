"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/current-member";

const ACTIVITY_SEEN_COOKIE = "shiftpoint-activity-seen-at";

export async function markActivitySeen() {
  await getCurrentMember();
  const cookieStore = await cookies();
  cookieStore.set(ACTIVITY_SEEN_COOKIE, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/activity");
}
