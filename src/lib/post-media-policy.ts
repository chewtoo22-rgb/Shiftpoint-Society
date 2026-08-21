export const POST_MEDIA_LIMITS = {
  maxFilesPerPost: 4,
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
} as const;

export const POST_MEDIA_MIME_TYPES = {
  image: new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]),
  video: new Set(["video/mp4", "video/quicktime", "video/webm"]),
} as const;

export type PostMediaKind = "IMAGE" | "VIDEO";

export type PostMediaCandidate = {
  name: string;
  mimeType: string;
  sizeBytes: number;
};

export type ValidatedPostMedia = PostMediaCandidate & {
  kind: PostMediaKind;
};

export function validatePostMediaCandidate(candidate: PostMediaCandidate): ValidatedPostMedia {
  const mimeType = candidate.mimeType.trim().toLowerCase();

  if (!candidate.name.trim()) {
    throw new Error("Media file must have a name.");
  }

  if (!Number.isSafeInteger(candidate.sizeBytes) || candidate.sizeBytes <= 0) {
    throw new Error("Media file size is invalid.");
  }

  if (POST_MEDIA_MIME_TYPES.image.has(mimeType)) {
    if (candidate.sizeBytes > POST_MEDIA_LIMITS.maxImageBytes) {
      throw new Error("Image exceeds the 10 MB upload limit.");
    }

    return { ...candidate, mimeType, kind: "IMAGE" };
  }

  if (POST_MEDIA_MIME_TYPES.video.has(mimeType)) {
    if (candidate.sizeBytes > POST_MEDIA_LIMITS.maxVideoBytes) {
      throw new Error("Video exceeds the 100 MB upload limit.");
    }

    return { ...candidate, mimeType, kind: "VIDEO" };
  }

  throw new Error("Unsupported media type.");
}

export function validatePostMediaBatch(candidates: PostMediaCandidate[]): ValidatedPostMedia[] {
  if (candidates.length > POST_MEDIA_LIMITS.maxFilesPerPost) {
    throw new Error(`A post can include up to ${POST_MEDIA_LIMITS.maxFilesPerPost} media files.`);
  }

  return candidates.map(validatePostMediaCandidate);
}
