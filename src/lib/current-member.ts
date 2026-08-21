import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Central identity boundary for every owner-scoped garage read/write.
 * Never accept an owner id from form data.
 */
export async function getCurrentMember() {
  const session = await auth();
  const sessionUser = session?.user as
    | (typeof session.user & { authSubject?: string; handle?: string })
    | undefined;

  if (!sessionUser?.authSubject || !sessionUser.handle) {
    throw new Error("Authentication required");
  }

  return db.user.upsert({
    where: { authSubject: sessionUser.authSubject },
    update: {
      handle: sessionUser.handle,
      displayName: sessionUser.name ?? undefined,
      avatarUrl: sessionUser.image ?? undefined,
    },
    create: {
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
