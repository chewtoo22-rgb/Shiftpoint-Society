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
        },
      },
      reactions: true,
      comments: {
        select: { id: true },
      },
    },
  });
}
