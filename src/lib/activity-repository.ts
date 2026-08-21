import { db } from "@/lib/db";

export async function getMemberActivity(memberId: string, limit = 40) {
  const [comments, reactions] = await Promise.all([
    db.comment.findMany({
      where: {
        authorId: { not: memberId },
        post: { authorId: memberId },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { handle: true, displayName: true } },
        post: { select: { id: true, body: true } },
      },
    }),
    db.reaction.findMany({
      where: {
        userId: { not: memberId },
        post: { authorId: memberId },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        postId: true,
        type: true,
        createdAt: true,
        user: { select: { handle: true, displayName: true } },
        post: { select: { body: true } },
      },
    }),
  ]);

  return [
    ...comments.map((comment) => ({
      id: `comment-${comment.id}`,
      kind: "COMMENT" as const,
      createdAt: comment.createdAt,
      actor: comment.author,
      postId: comment.post.id,
      postBody: comment.post.body,
      detail: comment.body,
    })),
    ...reactions.map((reaction) => ({
      id: `reaction-${reaction.postId}-${reaction.type}-${reaction.createdAt.getTime()}`,
      kind: "REACTION" as const,
      createdAt: reaction.createdAt,
      actor: reaction.user,
      postId: reaction.postId,
      postBody: reaction.post.body,
      detail: reaction.type,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}
