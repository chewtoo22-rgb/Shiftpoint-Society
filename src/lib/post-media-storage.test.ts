import { describe, expect, it } from "vitest";
import { validatePostMediaCandidate } from "./post-media-policy";
import { buildPostMediaObjectKey } from "./post-media-storage";

describe("buildPostMediaObjectKey", () => {
  it("scopes uploads to the authenticated member namespace", () => {
    const media = validatePostMediaCandidate({
      name: "garage-shot.png",
      mimeType: "image/png",
      sizeBytes: 2048,
    });

    expect(buildPostMediaObjectKey("member_123", media, "upload-token")).toBe(
      "members/member_123/post-media/upload-token.png",
    );
  });

  it("derives the extension from validated MIME type instead of the supplied filename", () => {
    const media = validatePostMediaCandidate({
      name: "not-really-an-image.exe",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
    });

    expect(buildPostMediaObjectKey("member_123", media, "token_2")).toBe(
      "members/member_123/post-media/token_2.jpg",
    );
  });

  it("rejects an empty owner id", () => {
    const media = validatePostMediaCandidate({
      name: "clip.mp4",
      mimeType: "video/mp4",
      sizeBytes: 2048,
    });

    expect(() => buildPostMediaObjectKey(" ", media, "token")).toThrow("owner is required");
  });

  it("rejects unsafe upload tokens", () => {
    const media = validatePostMediaCandidate({
      name: "clip.webm",
      mimeType: "video/webm",
      sizeBytes: 2048,
    });

    expect(() => buildPostMediaObjectKey("member_123", media, "../escape")).toThrow(
      "upload token is invalid",
    );
  });
});
