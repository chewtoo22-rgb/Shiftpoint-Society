import { createHash } from "node:crypto";

const ACTIVITY_SEEN_COOKIE_PREFIX = "shiftpoint-activity-seen-at";
const FUTURE_SKEW_MS = 5 * 60 * 1000;

export function getActivitySeenCookieName(memberId: string) {
  const normalizedMemberId = memberId.trim();
  if (!normalizedMemberId) {
    throw new Error("memberId is required to scope activity state");
  }

  const memberKey = createHash("sha256")
    .update(normalizedMemberId)
    .digest("hex")
    .slice(0, 24);

  return `${ACTIVITY_SEEN_COOKIE_PREFIX}-${memberKey}`;
}

export function parseActivitySeenAt(value: string | undefined, now = Date.now()) {
  if (!value) return null;

  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  if (!Number.isFinite(timestamp)) return null;
  if (timestamp > now + FUTURE_SKEW_MS) return null;

  return parsed;
}
