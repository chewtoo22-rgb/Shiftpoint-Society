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

  let grant: PostMediaCompletionGrant;
  try {
    grant = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PostMediaCompletionGrant;
  } catch {
    throw new Error("Invalid media completion grant.");
  }

  if (!Number.isFinite(grant.expiresAt) || grant.expiresAt < now) {
    throw new Error("Media completion grant expired.");
  }

  return grant;
}
