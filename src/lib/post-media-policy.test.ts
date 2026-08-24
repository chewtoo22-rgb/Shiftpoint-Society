import { describe, expect, it } from "vitest";
import {
  POST_MEDIA_LIMITS,
  validatePostMediaBatch,
  validatePostMediaCandidate,
} from "./post-media-policy";

describe("validatePostMediaCandidate", () => {
  it("accepts supported images within the limit", () => {
    expect(validatePostMediaCandidate({
      name: "garage.webp",
      mimeType: "image/webp",
      sizeBytes: 2_000_000,
    }).kind).toBe("IMAGE");
  });

  it("accepts supported videos within the limit", () => {
    expect(validatePostMediaCandidate({
      name: "pull.mp4",
      mimeType: "video/mp4",
      sizeBytes: 25_000_000,
    }).kind).toBe("VIDEO");
  });

  it("normalizes MIME type casing", () => {
    expect(validatePostMediaCandidate({
      name: "dyno.jpg",
      mimeType: " IMAGE/JPEG ",
      sizeBytes: 1_000,
    }).mimeType).toBe("image/jpeg");
  });

  it("trims accepted file names", () => {
    expect(validatePostMediaCandidate({
      name: "  garage.jpg  ",
      mimeType: "image/jpeg",
      sizeBytes: 1_000,
    }).name).toBe("garage.jpg");
  });

  it("rejects unsupported content types", () => {
    expect(() => validatePostMediaCandidate({
      name: "payload.svg",
      mimeType: "image/svg+xml",
      sizeBytes: 1_000,
    })).toThrow("Unsupported media type.");
  });

  it("rejects oversized images", () => {
    expect(() => validatePostMediaCandidate({
      name: "huge.jpg",
      mimeType: "image/jpeg",
      sizeBytes: POST_MEDIA_LIMITS.maxImageBytes + 1,
    })).toThrow("10 MB");
  });

  it("rejects invalid sizes", () => {
    expect(() => validatePostMediaCandidate({
      name: "empty.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 0,
    })).toThrow("size is invalid");
  });

  it("rejects overlong file names before persistence", () => {
    expect(() => validatePostMediaCandidate({
      name: `${"a".repeat(POST_MEDIA_LIMITS.maxFileNameChars)}.jpg`,
      mimeType: "image/jpeg",
      sizeBytes: 1_000,
    })).toThrow("file name is too long");
  });

  it("rejects file names containing control characters", () => {
    expect(() => validatePostMediaCandidate({
      name: "garage\u0000.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1_000,
    })).toThrow("invalid control characters");
  });

  it.each(["../garage.jpg", "build/garage.jpg", "build\\garage.jpg"])(
    "rejects file names containing path separators: %s",
    (name) => {
      expect(() => validatePostMediaCandidate({
        name,
        mimeType: "image/jpeg",
        sizeBytes: 1_000,
      })).toThrow("path separators");
    },
  );

  it("rejects bidirectional override characters that can spoof extensions", () => {
    expect(() => validatePostMediaCandidate({
      name: "garage\u202Egpj.exe",
      mimeType: "image/jpeg",
      sizeBytes: 1_000,
    })).toThrow("unsafe bidirectional characters");
  });
});

describe("validatePostMediaBatch", () => {
  it("limits a post to four media files", () => {
    const files = Array.from({ length: 5 }, (_, index) => ({
      name: `photo-${index}.jpg`,
      mimeType: "image/jpeg",
      sizeBytes: 1_000,
    }));

    expect(() => validatePostMediaBatch(files)).toThrow("up to 4 media files");
  });
});
