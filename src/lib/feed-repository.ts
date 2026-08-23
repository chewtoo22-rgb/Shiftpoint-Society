import { db } from "@/lib/db";

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
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
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
    orderBy: { createdAt: "asc" as const },
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
} as const;

export async function getCommunityFeed(limit = 30) {
  return db.post.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: feedPostInclude,
  });
}

export async function getCommunityFeedPost(postId: string) {
  return db.post.findUnique({
    where: { id: postId },
    include: feedPostInclude,
  });
}
