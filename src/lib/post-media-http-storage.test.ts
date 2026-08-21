import { describe, expect, it, vi } from "vitest";
import {
  HttpPostMediaStorageAdapter,
  validatePostMediaUploadTarget,
} from "./post-media-http-storage";

const descriptor = {
  ownerId: "member-1",
  objectKey: "members/member-1/post-media/token.jpg",
  originalName: "car.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  kind: "IMAGE" as const,
};

describe("validatePostMediaUploadTarget", () => {
  it("accepts HTTPS PUT targets", () => {
    expect(
      validatePostMediaUploadTarget({
        uploadUrl: "https://uploads.example.com/token",
        mediaUrl: "https://cdn.example.com/member-1/token.jpg",
        method: "PUT",
        headers: { "x-upload-token": "abc" },
      }),
    ).toMatchObject({ method: "PUT" });
  });

  it("rejects insecure upload URLs", () => {
    expect(() =>
      validatePostMediaUploadTarget({
        uploadUrl: "http://uploads.example.com/token",
        mediaUrl: "https://cdn.example.com/token.jpg",
        method: "PUT",
      }),
    ).toThrow(/HTTPS/);
  });

  it("rejects unsupported methods", () => {
    expect(() =>
      validatePostMediaUploadTarget({
        uploadUrl: "https://uploads.example.com/token",
        mediaUrl: "https://cdn.example.com/token.jpg",
        method: "DELETE",
      }),
    ).toThrow(/unsupported upload method/);
  });
});

describe("HttpPostMediaStorageAdapter", () => {
  it("posts the authorized descriptor to the signer", async () => {
    const fetchImpl = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>(async (_input, _init) =>
      new Response(
        JSON.stringify({
          uploadUrl: "https://uploads.example.com/token",
          mediaUrl: "https://cdn.example.com/member-1/token.jpg",
          method: "PUT",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const adapter = new HttpPostMediaStorageAdapter({
      signerUrl: "https://signer.example.com/post-media",
      fetchImpl,
    });

    await adapter.createUploadTarget(descriptor);

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [requestUrl, requestInit] = fetchImpl.mock.calls[0]!;
    expect(requestUrl).toBe("https://signer.example.com/post-media");
    expect(JSON.parse(String(requestInit?.body))).toEqual(descriptor);
  });

  it("fails closed when the signer rejects the request", async () => {
    const fetchImpl: typeof fetch = async () => new Response("no", { status: 403 });
    const adapter = new HttpPostMediaStorageAdapter({
      signerUrl: "https://signer.example.com/post-media",
      fetchImpl,
    });

    await expect(adapter.createUploadTarget(descriptor)).rejects.toThrow(/403/);
  });
});
