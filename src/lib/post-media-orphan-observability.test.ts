import { describe, expect, it } from "vitest";
import {
  diagnosePostMediaOrphanCleanupFailure,
  summarizePostMediaOrphanCleanup,
} from "./post-media-orphan-observability";

const item = (intentId: string, uploadedAt: string) => ({
  intentId,
  ownerId: "member-secret",
  objectKey: `members/member-secret/post-media/${intentId}.jpg`,
  uploadedAt: new Date(uploadedAt),
});

describe("summarizePostMediaOrphanCleanup", () => {
  it("summarizes dry-run counts and age bounds without exposing identifiers", () => {
    const first = item("intent-1", "2026-08-22T10:00:00.000Z");
    const second = item("intent-2", "2026-08-22T12:00:00.000Z");

    const summary = summarizePostMediaOrphanCleanup({
      dryRun: true,
      planned: [second, first],
      deleted: [],
      reconciled: [],
    });

    expect(summary).toEqual({
      mode: "dry-run",
      plannedCount: 2,
      deletedCount: 0,
      reconciledCount: 0,
      oldestPlannedUploadAt: "2026-08-22T10:00:00.000Z",
      newestPlannedUploadAt: "2026-08-22T12:00:00.000Z",
      reconciliationGapCount: 0,
    });
    expect(JSON.stringify(summary)).not.toContain("member-secret");
    expect(JSON.stringify(summary)).not.toContain("intent-1");
  });

  it("reports reconciliation gaps for destructive results", () => {
    const first = item("intent-1", "2026-08-22T10:00:00.000Z");
    const second = item("intent-2", "2026-08-22T12:00:00.000Z");

    expect(
      summarizePostMediaOrphanCleanup({
        dryRun: false,
        planned: [first, second],
        deleted: [first, second],
        reconciled: [first],
      }).reconciliationGapCount,
    ).toBe(1);
  });

  it("returns null age bounds for an empty plan", () => {
    const summary = summarizePostMediaOrphanCleanup({
      dryRun: true,
      planned: [],
      deleted: [],
      reconciled: [],
    });

    expect(summary.oldestPlannedUploadAt).toBeNull();
    expect(summary.newestPlannedUploadAt).toBeNull();
  });
});

describe("diagnosePostMediaOrphanCleanupFailure", () => {
  it("marks transient provider errors retryable", () => {
    expect(
      diagnosePostMediaOrphanCleanupFailure(
        new Error("Storage provider temporarily unavailable"),
      ),
    ).toMatchObject({ retryable: true });
  });

  it("keeps safety-gate failures non-retryable", () => {
    expect(
      diagnosePostMediaOrphanCleanupFailure(
        new Error("Destructive post media cleanup is not enabled."),
      ),
    ).toMatchObject({ retryable: false });
  });

  it("does not stringify arbitrary thrown values", () => {
    const diagnostic = diagnosePostMediaOrphanCleanupFailure({
      secret: "do-not-leak",
    });

    expect(diagnostic).toEqual({
      name: "UnknownError",
      message: "Post media orphan cleanup failed with a non-Error value.",
      retryable: false,
    });
    expect(JSON.stringify(diagnostic)).not.toContain("do-not-leak");
  });
});
