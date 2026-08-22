import type { PostMediaOrphanCleanupResult } from "./post-media-orphan-cleanup";

export type PostMediaOrphanCleanupSummary = {
  mode: "dry-run" | "destructive";
  plannedCount: number;
  deletedCount: number;
  reconciledCount: number;
  oldestPlannedUploadAt: string | null;
  newestPlannedUploadAt: string | null;
  reconciliationGapCount: number;
};

/**
 * Produces operator-safe cleanup telemetry without exposing member IDs,
 * storage object keys, filenames, or media URLs.
 *
 * This is intentionally a pure reporting function. It cannot invoke storage,
 * mutate upload intents, or enable destructive cleanup.
 */
export function summarizePostMediaOrphanCleanup(
  result: PostMediaOrphanCleanupResult,
): PostMediaOrphanCleanupSummary {
  const timestamps = result.planned
    .map((item) => item.uploadedAt.getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  const oldest = timestamps[0];
  const newest = timestamps[timestamps.length - 1];

  return {
    mode: result.dryRun ? "dry-run" : "destructive",
    plannedCount: result.planned.length,
    deletedCount: result.deleted.length,
    reconciledCount: result.reconciled.length,
    oldestPlannedUploadAt: oldest === undefined ? null : new Date(oldest).toISOString(),
    newestPlannedUploadAt: newest === undefined ? null : new Date(newest).toISOString(),
    reconciliationGapCount: Math.max(0, result.deleted.length - result.reconciled.length),
  };
}

export type PostMediaOrphanCleanupFailureDiagnostic = {
  name: string;
  message: string;
  retryable: boolean;
};

/**
 * Normalizes failures into a small operator-facing diagnostic shape.
 * Unknown values are deliberately collapsed instead of stringifying arbitrary
 * objects that could contain request/provider secrets.
 */
export function diagnosePostMediaOrphanCleanupFailure(
  error: unknown,
): PostMediaOrphanCleanupFailureDiagnostic {
  if (!(error instanceof Error)) {
    return {
      name: "UnknownError",
      message: "Post media orphan cleanup failed with a non-Error value.",
      retryable: false,
    };
  }

  const message = error.message || "Post media orphan cleanup failed.";
  const retryable =
    /provider|network|timeout|temporar|reconcil/i.test(message) &&
    !/not enabled|requires deletion|mismatched intent/i.test(message);

  return {
    name: error.name || "Error",
    message,
    retryable,
  };
}
