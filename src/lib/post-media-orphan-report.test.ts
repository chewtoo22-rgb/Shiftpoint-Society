import { describe, expect, it, vi } from "vitest";
import {
  runPostMediaOrphanDryRunReport,
  type PostMediaOrphanReportLogger,
} from "./post-media-orphan-report";

const candidate = {
  intentId: "intent-secret",
  ownerId: "member-secret",
  objectKey: "members/member-secret/post-media/intent-secret.jpg",
  uploadedAt: new Date("2026-08-22T10:00:00.000Z"),
};

describe("runPostMediaOrphanDryRunReport", () => {
  it("forces dry-run mode and emits aggregate-only telemetry", async () => {
    const runCleanup = vi.fn(async () => ({
      dryRun: true as const,
      planned: [candidate],
      deleted: [],
      reconciled: [],
    }));
    const info = vi.fn();
    const error = vi.fn();
    const logger: PostMediaOrphanReportLogger = { info, error };

    const report = await runPostMediaOrphanDryRunReport(
      {
        now: new Date("2026-08-22T12:00:00.000Z"),
        limit: 25,
      },
      { runCleanup, logger },
    );

    expect(runCleanup).toHaveBeenCalledWith({
      now: new Date("2026-08-22T12:00:00.000Z"),
      limit: 25,
      dryRun: true,
      destructiveEnabled: false,
    });
    expect(report).toEqual({
      ok: true,
      summary: {
        mode: "dry-run",
        plannedCount: 1,
        deletedCount: 0,
        reconciledCount: 0,
        oldestPlannedUploadAt: "2026-08-22T10:00:00.000Z",
        newestPlannedUploadAt: "2026-08-22T10:00:00.000Z",
        reconciliationGapCount: 0,
      },
    });
    expect(info).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    expect(JSON.stringify(info.mock.calls)).not.toContain("member-secret");
    expect(JSON.stringify(info.mock.calls)).not.toContain("intent-secret");
  });

  it("fails closed if a runner reports destructive execution", async () => {
    const runCleanup = vi.fn(async () => ({
      dryRun: false as const,
      planned: [candidate],
      deleted: [candidate],
      reconciled: [candidate],
    }));
    const info = vi.fn();
    const error = vi.fn();

    const report = await runPostMediaOrphanDryRunReport(
      {},
      { runCleanup, logger: { info, error } },
    );

    expect(report).toMatchObject({
      ok: false,
      diagnostic: {
        retryable: false,
      },
    });
    expect(info).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      "post_media_orphan_cleanup_dry_run_failed",
      expect.objectContaining({ retryable: false }),
    );
  });

  it("does not put raw failure messages into logger fields", async () => {
    const secretMessage = "database failed for member-secret/object-secret";
    const runCleanup = vi.fn(async () => {
      throw new Error(secretMessage);
    });
    const info = vi.fn();
    const error = vi.fn();

    const report = await runPostMediaOrphanDryRunReport(
      {},
      { runCleanup, logger: { info, error } },
    );

    expect(report).toMatchObject({ ok: false });
    expect(JSON.stringify(error.mock.calls)).not.toContain(secretMessage);
    expect(JSON.stringify(error.mock.calls)).not.toContain("member-secret");
    expect(info).not.toHaveBeenCalled();
  });
});
