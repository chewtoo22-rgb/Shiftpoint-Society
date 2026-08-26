import type { Prisma } from "@prisma/client";

import { db } from "./db";

export const COMMUNITY_FEED_DEFAULT_LIMIT = 30;
export const COMMUNITY_FEED_MAX_LIMIT = 50;
export const COMMUNITY_POST_MEDIA_MAX = 4;

export const COMMUNITY_FEED_ORDER = [
  { createdAt: "desc" },
  { id: "asc" },
] satisfies Prisma.PostOrderByWithRelationInput[];

export const COMMUNITY_COMMENT_ORDER = [
  { createdAt: "desc" },
  { id: "asc" },
] satisfies Prisma.CommentOrderByWithRelationInput[];

export const COMMUNITY_BUILD_ENTRY_ORDER = [
  { occurredAt: "desc" },
  { id: "asc" },
] satisfies Prisma.BuildEntryOrderByWithRelationInput[];

export function normalizeCommunityFeedLimit(limit = COMMUNITY_FEED_DEFAULT_LIMIT) {
  if (!Number.isFinite(limit)) return COMMUNITY_FEED_DEFAULT_LIMIT;

  const normalized = Math.trunc(limit);
  if (normalized < 1) return 1;

  return Math.min(normalized, COMMUNITY_FEED_MAX_LIMIT);
}

export function buildCommunityFeedPostWhere(postId: string): Prisma.PostWhereUniqueInput {
  return { id: postId };
}

const feedPostInclude = {
  author: {
    select: {
      handle: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  car: {
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      nickname: true,
      heroImageUrl: true,
    },
  },
  media: {
    take: COMMUNITY_POST_MEDIA_MAX,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      url: true,
      type: true,
      mimeType: true,
      sizeBytes: true,
      originalName: true,
      sortOrder: true,
    },
  },
  reactions: {
    select: {
      userId: true,
      type: true,
    },
  },
  comments: {
    orderBy: COMMUNITY_COMMENT_ORDER,
    take: 8,
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: {
        select: {
          handle: true,
          displayName: true,
        },
      },
    },
  },
  _count: {
    select: {
      comments: true,
    },
  },
} satisfies Prisma.PostInclude;

const feedPostDetailInclude = {
  ...feedPostInclude,
  car: {
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
      buildEntries: {
        take: 3,
        orderBy: COMMUNITY_BUILD_ENTRY_ORDER,
        select: {
          id: true,
          title: true,
          occurredAt: true,
          mileage: true,
          dynoHp: true,
          dynoTorque: true,
        },
      },
      _count: {
        select: {
          buildEntries: true,
          carParts: true,
        },
      },
    },
  },
} satisfies Prisma.PostInclude;

export async function getCommunityFeed(limit = COMMUNITY_FEED_DEFAULT_LIMIT) {
  return db.post.findMany({
    take: normalizeCommunityFeedLimit(limit),
    orderBy: COMMUNITY_FEED_ORDER,
    include: feedPostInclude,
  });
}

export async function getCommunityFeedPost(postId: string) {
  return db.post.findUnique({
    where: buildCommunityFeedPostWhere(postId),
    include: feedPostDetailInclude,
  });
}
