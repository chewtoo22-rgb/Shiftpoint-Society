import { db } from "./db";
import { normalizeSocietyHandle } from "./society-handle";

export const PUBLIC_MEMBER_GARAGE_MAX_CARS = 50;

export const publicMemberProfileSelect = {
  handle: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  _count: {
    select: {
      cars: true,
    },
  },
  cars: {
    orderBy: { updatedAt: "desc" },
    take: PUBLIC_MEMBER_GARAGE_MAX_CARS,
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      trim: true,
      nickname: true,
      engine: true,
      drivetrain: true,
      powerHp: true,
      quarterMileSeconds: true,
      quarterMileMph: true,
      isVerified: true,
      updatedAt: true,
      _count: {
        select: {
          buildEntries: true,
          carParts: true,
        },
      },
    },
  },
} as const;

export function buildPublicMemberLookup(handle: string) {
  return { handle: normalizeSocietyHandle(handle) };
}

export async function getPublicMemberProfile(handle: string) {
  const member = await db.user.findUnique({
    where: buildPublicMemberLookup(handle),
    select: publicMemberProfileSelect,
  });

  return member;
}
