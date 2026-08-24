import { createHmac, timingSafeEqual } from "node:crypto";

export type PostMediaCompletionGrant = {
  ownerId: string;
  objectKey: string;
  mediaUrl: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "IMAGE" | "VIDEO";
  expiresAt: number;
};

const GRANT_TTL_MS = 15 * 60 * 1000;

function secret() {
  const value = process.env.AUTH_SECRET?.trim();
  if (!value) throw new Error("AUTH_SECRET is required for media completion grants.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function parseGrantPayload(payload: string): PostMediaCompletionGrant {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid media completion grant.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid media completion grant.");
  }

  const grant = value as Record<string, unknown>;
  const keys = Object.keys(grant).sort();
  const expectedKeys = [
    "expiresAt",
    "kind",
    "mediaUrl",
    "mimeType",
    "objectKey",
    "originalName",
    "ownerId",
    "sizeBytes",
  ].sort();

  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error("Invalid media completion grant.");
  }

  if (
    typeof grant.ownerId !== "string" || !grant.ownerId.trim() ||
    typeof grant.objectKey !== "string" || !grant.objectKey.trim() ||
    typeof grant.mediaUrl !== "string" || !grant.mediaUrl.trim() ||
    typeof grant.originalName !== "string" || !grant.originalName.trim() ||
    typeof grant.mimeType !== "string" || !grant.mimeType.trim() ||
    !Number.isSafeInteger(grant.sizeBytes) || Number(grant.sizeBytes) <= 0 ||
    (grant.kind !== "IMAGE" && grant.kind !== "VIDEO") ||
    typeof grant.expiresAt !== "number" || !Number.isFinite(grant.expiresAt)
  ) {
    throw new Error("Invalid media completion grant.");
  }

  return grant as unknown as PostMediaCompletionGrant;
}

export function createPostMediaCompletionGrant(
  input: Omit<PostMediaCompletionGrant, "expiresAt">,
  now = Date.now(),
) {
  const grant: PostMediaCompletionGrant = {
    ...input,
    expiresAt: now + GRANT_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(grant), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyPostMediaCompletionGrant(token: string, now = Date.now()): PostMediaCompletionGrant {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new Error("Invalid media completion grant.");

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("Invalid media completion grant.");
  }

  const grant = parseGrantPayload(payload);

  if (grant.expiresAt <= now) {
    throw new Error("Media completion grant expired.");
  }

  return grant;
}
