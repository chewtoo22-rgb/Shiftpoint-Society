import type { Prisma } from "@prisma/client";

import { db } from "./db";
import { normalizeSocietyHandle, validateSocietyHandle } from "./society-handle";

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
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
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
} satisfies Prisma.UserSelect;

export function buildPublicMemberLookup(handle: string) {
  return { handle: normalizeSocietyHandle(handle) };
}

export function buildValidatedPublicMemberLookup(handle: string) {
  try {
    return { handle: validateSocietyHandle(handle) };
  } catch {
    return null;
  }
}

export async function getPublicMemberProfile(handle: string) {
  const where = buildValidatedPublicMemberLookup(handle);
  if (!where) return null;

  const member = await db.user.findUnique({
    where,
    select: publicMemberProfileSelect,
  });

  return member;
}
