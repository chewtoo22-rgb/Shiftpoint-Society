import { db } from "@/lib/db";

export async function getCommunityFeed(limit = 30) {
  return db.post.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
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
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          url: true,
          type: true,
          mimeType: true,
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
        orderBy: { createdAt: "asc" },
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
    },
  });
}
