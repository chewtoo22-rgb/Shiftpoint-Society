import type { PostMediaKind, ValidatedPostMedia } from "./post-media-policy";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export type PostMediaUploadDescriptor = {
  ownerId: string;
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: PostMediaKind;
};

export type PostMediaUploadTarget = {
  uploadUrl: string;
  mediaUrl: string;
  method: "PUT" | "POST";
  headers?: Record<string, string>;
};

export interface PostMediaStorageAdapter {
  createUploadTarget(descriptor: PostMediaUploadDescriptor): Promise<PostMediaUploadTarget>;
}

export function buildPostMediaObjectKey(ownerId: string, media: ValidatedPostMedia, token: string) {
  const safeOwnerId = ownerId.trim();
  const safeToken = token.trim();
  const extension = MIME_EXTENSIONS[media.mimeType];

  if (!safeOwnerId) {
    throw new Error("Post media owner is required.");
  }

  if (!safeToken || !/^[a-zA-Z0-9_-]+$/.test(safeToken)) {
    throw new Error("Post media upload token is invalid.");
  }

  if (!extension) {
    throw new Error("Post media MIME type is not mapped to storage.");
  }

  return `members/${encodeURIComponent(safeOwnerId)}/post-media/${safeToken}.${extension}`;
}
