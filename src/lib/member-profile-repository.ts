import { db } from "./db";
import { normalizeSocietyHandle } from "./society-handle";

export const publicMemberProfileSelect = {
  handle: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  cars: {
    orderBy: { updatedAt: "desc" },
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
