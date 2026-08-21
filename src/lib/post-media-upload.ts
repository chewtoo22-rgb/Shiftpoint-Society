import { randomUUID } from "node:crypto";
import { getCurrentMember } from "@/lib/current-member";
import { validatePostMediaBatch, type PostMediaCandidate } from "@/lib/post-media-policy";
import {
  buildPostMediaObjectKey,
  type PostMediaStorageAdapter,
  type PostMediaUploadTarget,
} from "@/lib/post-media-storage";

export type AuthorizedPostMediaUpload = PostMediaUploadTarget & {
  ownerId: string;
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "IMAGE" | "VIDEO";
};

/**
 * Server-side authorization boundary for post media uploads.
 * The owner is always resolved from the authenticated Society session;
 * callers never submit or select an owner id.
 */
export async function authorizePostMediaUploads(
  candidates: PostMediaCandidate[],
  storage: PostMediaStorageAdapter,
): Promise<AuthorizedPostMediaUpload[]> {
  const member = await getCurrentMember();
  const media = validatePostMediaBatch(candidates);

  return Promise.all(
    media.map(async (item) => {
      const objectKey = buildPostMediaObjectKey(member.id, item, randomUUID());
      const target = await storage.createUploadTarget({
        ownerId: member.id,
        objectKey,
        originalName: item.name,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        kind: item.kind,
      });

      return {
        ...target,
        ownerId: member.id,
        objectKey,
        originalName: item.name,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        kind: item.kind,
      };
    }),
  );
}
