const POST_MEDIA_OBJECT_PREFIX = "post-media";
const POST_MEDIA_OBJECT_NAME = /^[a-zA-Z0-9_-]+\.(?:avif|gif|jpg|png|webp|mp4|mov|webm)$/;

export function assertOwnedPostMediaObjectKey(ownerId: string, objectKey: string) {
  const safeOwnerId = ownerId.trim();
  const safeObjectKey = objectKey.trim();

  if (!safeOwnerId) {
    throw new Error("Post media owner is required.");
  }

  const prefix = `members/${encodeURIComponent(safeOwnerId)}/${POST_MEDIA_OBJECT_PREFIX}/`;
  if (!safeObjectKey.startsWith(prefix)) {
    throw new Error("Post media object does not belong to the current member.");
  }

  const objectName = safeObjectKey.slice(prefix.length);
  if (!POST_MEDIA_OBJECT_NAME.test(objectName)) {
    throw new Error("Post media object key is invalid.");
  }

  return safeObjectKey;
}

export function validatePostMediaPublicUrl(mediaUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(mediaUrl.trim());
  } catch {
    throw new Error("Post media URL is invalid.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Post media URL must use HTTPS.");
  }

  if (!parsed.hostname) {
    throw new Error("Post media URL requires a host.");
  }

  return parsed.toString();
}
