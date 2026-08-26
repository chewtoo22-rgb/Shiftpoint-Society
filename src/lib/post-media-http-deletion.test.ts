import { describe, expect, it, vi } from "vitest";
import { HttpPostMediaDeletionAdapter } from "./post-media-http-deletion";

const request = {
  ownerId: "member-1",
  objectKey: "members/member-1/post-media/upload_1.jpg",
};

describe("HttpPostMediaDeletionAdapter", () => {
  it("requires an HTTPS deletion endpoint", () => {
    expect(() => new HttpPostMediaDeletionAdapter({ endpoint: "http://storage.example/delete" })).toThrow(
      "Post media deletion endpoint must use HTTPS.",
    );
  });

  it("posts the exact deletion request to the provider", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      calls.push([input, init]);
      return new Response(null, { status: 204 });
    });

    const adapter = new HttpPostMediaDeletionAdapter({
      endpoint: "https://storage.example/delete",
      fetchImpl,
    });

    await expect(adapter.deleteObject(request)).resolves.toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(String(calls[0][0])).toBe("https://storage.example/delete");
    expect(calls[0][1]).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });
  });

  it("fails closed when the provider rejects deletion", async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => new Response(null, { status: 503 }));
    const adapter = new HttpPostMediaDeletionAdapter({
      endpoint: "https://storage.example/delete",
      fetchImpl,
    });

    await expect(adapter.deleteObject(request)).rejects.toThrow(
      "Post media deletion provider rejected the request (503).",
    );
  });
});
