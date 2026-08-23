import { db } from "@/lib/db";

export function buildPublicCarLookup(handle: string, carId: string) {
  return {
    id: carId,
    owner: { handle },
  };
}

export async function getPublicCarBuild(handle: string, carId: string) {
  return db.car.findFirst({
    where: buildPublicCarLookup(handle, carId),
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
      posts: {
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          kind: true,
          body: true,
          createdAt: true,
          _count: {
            select: {
              comments: true,
              reactions: true,
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
