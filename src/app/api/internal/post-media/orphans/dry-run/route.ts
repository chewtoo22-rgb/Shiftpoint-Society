import { authorizePostMediaOrphanOperator } from "@/lib/post-media-orphan-operator-auth";
import { runPostMediaOrphanDryRunReport } from "@/lib/post-media-orphan-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

/**
 * Read-only operator endpoint for orphan-media dry-run reporting.
 *
 * This route has no destructive cleanup capability and returns only the
 * aggregate/redacted report produced by runPostMediaOrphanDryRunReport().
 */
export async function POST(request: Request) {
  const authorized = authorizePostMediaOrphanOperator(
    request.headers.get("authorization"),
    process.env.POST_MEDIA_ORPHAN_REPORT_TOKEN,
  );

  if (!authorized) {
    return Response.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const report = await runPostMediaOrphanDryRunReport();

  return Response.json(report, {
    status: report.ok ? 200 : 503,
    headers: NO_STORE_HEADERS,
  });
}
