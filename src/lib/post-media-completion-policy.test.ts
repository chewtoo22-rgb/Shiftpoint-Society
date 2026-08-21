import { describe, expect, it } from "vitest";
import {
  assertOwnedPostMediaObjectKey,
  validatePostMediaPublicUrl,
} from "./post-media-completion-policy";

describe("post media completion policy", () => {
  it("accepts a media object inside the current member namespace", () => {
    expect(
      assertOwnedPostMediaObjectKey(
        "member 42",
        "members/member%2042/post-media/abc_123.webp",
      ),
    ).toBe("members/member%2042/post-media/abc_123.webp");
  });

  it("rejects media objects owned by another member", () => {
    expect(() =>
      assertOwnedPostMediaObjectKey(
        "member-a",
        "members/member-b/post-media/abc123.jpg",
      ),
    ).toThrow("does not belong to the current member");
  });

  it("rejects traversal or nested object names", () => {
    expect(() =>
      assertOwnedPostMediaObjectKey(
        "member-a",
        "members/member-a/post-media/../abc123.jpg",
      ),
    ).toThrow("object key is invalid");
  });

  it("accepts HTTPS public media URLs", () => {
    expect(validatePostMediaPublicUrl("https://cdn.example.com/media/abc.jpg")).toBe(
      "https://cdn.example.com/media/abc.jpg",
    );
  });

  it("rejects non-HTTPS media URLs", () => {
    expect(() => validatePostMediaPublicUrl("http://cdn.example.com/media/abc.jpg")).toThrow(
      "must use HTTPS",
    );
  });
});
