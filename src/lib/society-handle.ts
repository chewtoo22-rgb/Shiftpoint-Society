export const SOCIETY_HANDLE_MIN_LENGTH = 3;
export const SOCIETY_HANDLE_MAX_LENGTH = 32;

const SOCIETY_HANDLE_PATTERN = /^[a-z0-9_-]+$/;

/**
 * Canonical Society handles are lowercase so public profile URLs and unique
 * member identity stay stable regardless of provider/client casing.
 */
export function normalizeSocietyHandle(value: string) {
  return value.trim().toLowerCase();
}

export function validateSocietyHandle(value: string) {
  const handle = normalizeSocietyHandle(value);

  if (
    handle.length < SOCIETY_HANDLE_MIN_LENGTH ||
    handle.length > SOCIETY_HANDLE_MAX_LENGTH ||
    !SOCIETY_HANDLE_PATTERN.test(handle)
  ) {
    throw new Error("Invalid Society handle");
  }

  return handle;
}
