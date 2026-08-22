import type {
  PostMediaDeleteObjectRequest,
  PostMediaDeletionAdapter,
} from "./post-media-orphan-cleanup";

function requireHttpsEndpoint(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Post media deletion endpoint must be a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Post media deletion endpoint must use HTTPS.");
  }

  return url.toString();
}

/**
 * Provider-neutral HTTP deletion adapter.
 *
 * This adapter is intentionally not wired into executePostMediaOrphanCleanup;
 * Phase 0 cleanup remains dry-run only. Keeping construction explicit prevents
 * merely setting an environment variable from enabling destructive behavior.
 */
export class HttpPostMediaDeletionAdapter implements PostMediaDeletionAdapter {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: { endpoint: string; fetchImpl?: typeof fetch }) {
    this.endpoint = requireHttpsEndpoint(options.endpoint);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async deleteObject(request: PostMediaDeleteObjectRequest): Promise<void> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Post media deletion provider rejected the request (${response.status}).`);
    }
  }
}
