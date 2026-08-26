"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/current-member";
import { getActivitySeenCookieName } from "@/lib/activity-seen";

export async function markActivitySeen() {
  const member = await getCurrentMember();
  const cookieStore = await cookies();
  cookieStore.set(getActivitySeenCookieName(member.id), new Date().toISOString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/activity");
}
