import type {
  PostMediaStorageAdapter,
  PostMediaUploadDescriptor,
  PostMediaUploadTarget,
} from "./post-media-storage";

function requireHttpsUrl(value: string, label: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${label} must use HTTPS.`);
  }

  return url.toString();
}

export function validatePostMediaUploadTarget(value: unknown): PostMediaUploadTarget {
  if (!value || typeof value !== "object") {
    throw new Error("Storage signer returned an invalid upload target.");
  }

  const candidate = value as Partial<PostMediaUploadTarget>;
  if (candidate.method !== "PUT" && candidate.method !== "POST") {
    throw new Error("Storage signer returned an unsupported upload method.");
  }

  const uploadUrl = requireHttpsUrl(candidate.uploadUrl ?? "", "Upload URL");
  const mediaUrl = requireHttpsUrl(candidate.mediaUrl ?? "", "Media URL");

  let headers: Record<string, string> | undefined;
  if (candidate.headers !== undefined) {
    if (!candidate.headers || typeof candidate.headers !== "object" || Array.isArray(candidate.headers)) {
      throw new Error("Storage signer returned invalid upload headers.");
    }

    headers = Object.fromEntries(
      Object.entries(candidate.headers).map(([name, headerValue]) => {
        if (typeof headerValue !== "string") {
          throw new Error("Storage signer returned a non-string upload header.");
        }
        return [name, headerValue];
      }),
    );
  }

  return { uploadUrl, mediaUrl, method: candidate.method, headers };
}

export class HttpPostMediaStorageAdapter implements PostMediaStorageAdapter {
  private readonly signerUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: { signerUrl: string; fetchImpl?: typeof fetch }) {
    this.signerUrl = requireHttpsUrl(options.signerUrl, "Post media signer URL");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createUploadTarget(descriptor: PostMediaUploadDescriptor): Promise<PostMediaUploadTarget> {
    const response = await this.fetchImpl(this.signerUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(descriptor),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Post media signer rejected the upload request (${response.status}).`);
    }

    return validatePostMediaUploadTarget(await response.json());
  }
}

export function createConfiguredPostMediaStorageAdapter() {
  const signerUrl = process.env.POST_MEDIA_SIGNER_URL?.trim();

  if (!signerUrl) {
    throw new Error("Post media uploads are not configured.");
  }

  return new HttpPostMediaStorageAdapter({ signerUrl });
}
