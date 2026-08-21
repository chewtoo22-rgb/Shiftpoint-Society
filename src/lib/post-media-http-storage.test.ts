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
    const fetchImpl = vi.fn(async () =>
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
      fetchImpl: fetchImpl as typeof fetch,
    });

    await adapter.createUploadTarget(descriptor);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://signer.example.com/post-media");
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toEqual(descriptor);
  });

  it("fails closed when the signer rejects the request", async () => {
    const adapter = new HttpPostMediaStorageAdapter({
      signerUrl: "https://signer.example.com/post-media",
      fetchImpl: (async () => new Response("no", { status: 403 })) as typeof fetch,
    });

    await expect(adapter.createUploadTarget(descriptor)).rejects.toThrow(/403/);
  });
});
