import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

type SessionMember = {
  authSubject?: string;
  handle?: string;
  name?: string | null;
  image?: string | null;
};

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

  return db.user.create({
    data: {
      authSubject: sessionUser.authSubject,
      handle: sessionUser.handle,
      displayName: sessionUser.name ?? sessionUser.handle,
      avatarUrl: sessionUser.image ?? undefined,
    },
  });
}

export async function requireOwnedCar(carId: string) {
  const member = await getCurrentMember();
  const car = await db.car.findFirst({
    where: { id: carId, ownerId: member.id },
    select: { id: true, ownerId: true },
  });

  if (!car) {
    throw new Error("Garage car not found for current member");
  }

  return { member, car };
}
