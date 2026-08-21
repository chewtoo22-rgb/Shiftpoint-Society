import { db } from "@/lib/db";

/**
 * Phase 0 identity boundary.
 *
 * All garage reads and writes go through this module so the temporary
 * development identity can be replaced by Auth.js without rewriting the
 * domain actions. Never accept an owner id from form data.
 */
export async function getCurrentMember() {
  return db.user.upsert({
    where: { handle: "founder" },
    update: {},
    create: { handle: "founder", displayName: "Shiftpoint Founder" },
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
