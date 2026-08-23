import { db } from "@/lib/db";

export async function getPublicCarBuild(handle: string, carId: string) {
  return db.car.findFirst({
    where: {
      id: carId,
      owner: { handle },
    },
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      trim: true,
      nickname: true,
      drivetrain: true,
      engine: true,
      powerHp: true,
      torqueLbFt: true,
      quarterMileSeconds: true,
      quarterMileMph: true,
      heroImageUrl: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          handle: true,
          displayName: true,
        },
      },
      buildEntries: {
        orderBy: { occurredAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          body: true,
          occurredAt: true,
          mileage: true,
          dynoHp: true,
          dynoTorque: true,
        },
      },
      carParts: {
        orderBy: { installedAt: "desc" },
        take: 24,
        select: {
          installedAt: true,
          notes: true,
          part: {
            select: {
              id: true,
              brand: true,
              name: true,
              category: true,
              partNumber: true,
            },
          },
        },
      },
      _count: {
        select: {
          buildEntries: true,
          carParts: true,
          posts: true,
        },
      },
    },
  });
}
