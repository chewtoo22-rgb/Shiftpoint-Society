import { timingSafeEqual } from "node:crypto";

const BEARER_PREFIX = "Bearer ";

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Authorizes the read-only orphan-media operator report endpoint.
 *
 * The token is server-configured and never used to derive member ownership or
 * deletion capability. Missing configuration fails closed.
 */
export function authorizePostMediaOrphanOperator(
  authorizationHeader: string | null,
  configuredToken: string | undefined,
) {
  const token = configuredToken?.trim();

  if (!token || !authorizationHeader?.startsWith(BEARER_PREFIX)) {
    return false;
  }

  const presentedToken = authorizationHeader.slice(BEARER_PREFIX.length).trim();

  if (!presentedToken) {
    return false;
  }

  return constantTimeEqual(presentedToken, token);
}
