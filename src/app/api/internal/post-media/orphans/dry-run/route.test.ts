import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authorizePostMediaOrphanOperator = vi.fn();
const runPostMediaOrphanDryRunReport = vi.fn();

vi.mock("@/lib/post-media-orphan-operator-auth", () => ({
  authorizePostMediaOrphanOperator,
}));

vi.mock("@/lib/post-media-orphan-report", () => ({
  runPostMediaOrphanDryRunReport,
}));

import { POST } from "./route";

const endpoint = "https://society.example/api/internal/post-media/orphans/dry-run";

function request(authorization?: string) {
  return new Request(endpoint, {
    method: "POST",
    headers: authorization ? { authorization } : undefined,
  });
}

describe("POST /api/internal/post-media/orphans/dry-run", () => {
  const originalToken = process.env.POST_MEDIA_ORPHAN_REPORT_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POST_MEDIA_ORPHAN_REPORT_TOKEN = "operator-secret";
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.POST_MEDIA_ORPHAN_REPORT_TOKEN;
    } else {
      process.env.POST_MEDIA_ORPHAN_REPORT_TOKEN = originalToken;
    }
  });

  it("fails closed before report generation when operator authorization fails", async () => {
    authorizePostMediaOrphanOperator.mockReturnValue(false);

    const response = await POST(request("Bearer wrong-secret"));

    expect(authorizePostMediaOrphanOperator).toHaveBeenCalledWith(
      "Bearer wrong-secret",
      "operator-secret",
    );
    expect(runPostMediaOrphanDryRunReport).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: false, error: "unauthorized" });
  });

  it("returns only the read-only report when operator authorization succeeds", async () => {
    authorizePostMediaOrphanOperator.mockReturnValue(true);
    runPostMediaOrphanDryRunReport.mockResolvedValue({
      ok: true,
      candidates: 2,
      recoverableBytes: 4096,
    });

    const response = await POST(request("Bearer operator-secret"));

    expect(runPostMediaOrphanDryRunReport).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      candidates: 2,
      recoverableBytes: 4096,
    });
  });

  it("preserves fail-closed no-store behavior when reporting is unavailable", async () => {
    authorizePostMediaOrphanOperator.mockReturnValue(true);
    runPostMediaOrphanDryRunReport.mockResolvedValue({
      ok: false,
      error: "storage_unavailable",
    });

    const response = await POST(request("Bearer operator-secret"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "storage_unavailable",
    });
  });
});
