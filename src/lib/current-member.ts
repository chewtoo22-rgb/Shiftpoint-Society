import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { validateSocietyHandle } from "./society-handle";

type SessionMember = {
  authSubject?: string;
  handle?: string;
  name?: string | null;
  image?: string | null;
};

/**
 * Read the signed-in Society member without forcing authentication.
 * Shared chrome can use this to render member-aware UI while public/auth
 * routes remain accessible.
 */
export async function getOptionalCurrentMember() {
  const session = await auth();
  const sessionUser = session?.user as SessionMember | undefined;

  if (!sessionUser?.authSubject) {
    return null;
  }

  return db.user.findUnique({
    where: { authSubject: sessionUser.authSubject },
  });
}

/**
 * Narrow optional identity projection for shared shell concerns that only need
 * a stable member identifier. Keeping this separate prevents layout-level
 * reads from pulling the full member row into memory merely to calculate
 * member-scoped chrome such as unread activity counts.
 */
export async function getOptionalCurrentMemberId() {
  const session = await auth();
  const sessionUser = session?.user as SessionMember | undefined;

  if (!sessionUser?.authSubject) {
    return null;
  }

  return db.user.findUnique({
    where: { authSubject: sessionUser.authSubject },
    select: { id: true },
  });
}

/**
 * Central identity boundary for every owner-scoped garage read/write.
 * Never accept an owner id from form data.
 *
 * The provider handle is only a bootstrap value. Once a member chooses a
 * Society handle, normal authenticated requests must never overwrite it.
 */
export async function getCurrentMember() {
  const session = await auth();
  const sessionUser = session?.user as SessionMember | undefined;

  if (!sessionUser?.authSubject || !sessionUser.handle) {
    redirect("/sign-in");
  }

  const existing = await db.user.findUnique({
    where: { authSubject: sessionUser.authSubject },
  });

  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: {
        displayName: existing.displayName ?? sessionUser.name ?? undefined,
        avatarUrl: sessionUser.image ?? existing.avatarUrl ?? undefined,
      },
    });
  }

  const handle = validateSocietyHandle(sessionUser.handle);

  return db.user.create({
    data: {
      authSubject: sessionUser.authSubject,
      handle,
      displayName: sessionUser.name ?? handle,
      avatarUrl: sessionUser.image ?? undefined,
    },
  });
}

export async function requireOwnedCar(carId: string) {
  const member = await getCurrentMember();
  const car = await db.car.findFirst({
    where: { id: carId, ownerId: member.id },
    select: { id: true },
  });

  if (!car) {
    throw new Error("Garage car not found for current member");
  }

  return { member, car };
}
