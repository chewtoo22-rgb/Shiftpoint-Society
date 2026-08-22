import type { PostMediaOrphanCleanupResult } from "./post-media-orphan-cleanup";
import {
  diagnosePostMediaOrphanCleanupFailure,
  summarizePostMediaOrphanCleanup,
  type PostMediaOrphanCleanupFailureDiagnostic,
  type PostMediaOrphanCleanupSummary,
} from "./post-media-orphan-observability";
import { runPostMediaOrphanCleanup } from "./post-media-orphan-service";

type DryRunOptions = {
  now?: Date;
  limit?: number;
};

type CleanupRunner = (options?: {
  now?: Date;
  limit?: number;
  dryRun?: boolean;
  destructiveEnabled?: boolean;
}) => Promise<PostMediaOrphanCleanupResult>;

export type PostMediaOrphanReportLogger = {
  info: (event: string, fields: Record<string, unknown>) => void;
  error: (event: string, fields: Record<string, unknown>) => void;
};

type PostMediaOrphanReportDependencies = {
  runCleanup?: CleanupRunner;
  logger?: PostMediaOrphanReportLogger;
};

export type PostMediaOrphanDryRunReport =
  | {
      ok: true;
      summary: PostMediaOrphanCleanupSummary;
    }
  | {
      ok: false;
      diagnostic: PostMediaOrphanCleanupFailureDiagnostic;
    };

/**
 * Server-only reporting entrypoint for orphaned post-media upload intents.
 *
 * This entrypoint always forces dry-run mode and never accepts or constructs a
 * deletion adapter. Its logger contract only receives aggregate telemetry or a
 * minimal failure classification; object keys, member IDs, filenames, URLs,
 * and raw failure messages are deliberately excluded from log fields.
 */
export async function runPostMediaOrphanDryRunReport(
  options: DryRunOptions = {},
  dependencies: PostMediaOrphanReportDependencies = {},
): Promise<PostMediaOrphanDryRunReport> {
  const runCleanup = dependencies.runCleanup ?? runPostMediaOrphanCleanup;

  try {
    const result = await runCleanup({
      now: options.now,
      limit: options.limit,
      dryRun: true,
      destructiveEnabled: false,
    });

    if (!result.dryRun) {
      throw new Error("Dry-run cleanup runner returned a destructive result.");
    }

    const summary = summarizePostMediaOrphanCleanup(result);

    dependencies.logger?.info("post_media_orphan_cleanup_dry_run", {
      ...summary,
    });

    return {
      ok: true,
      summary,
    };
  } catch (error) {
    const diagnostic = diagnosePostMediaOrphanCleanupFailure(error);

    dependencies.logger?.error("post_media_orphan_cleanup_dry_run_failed", {
      name: diagnostic.name,
      retryable: diagnostic.retryable,
    });

    return {
      ok: false,
      diagnostic,
    };
  }
}
