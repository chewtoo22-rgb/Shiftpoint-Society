import { describe, expect, it } from "vitest";
import { extractPostAttachment } from "./post-media";

describe("extractPostAttachment", () => {
  it("extracts a safe HTTPS link", () => {
    expect(extractPostAttachment("Check this https://example.com/part?id=42"))
      .toEqual({ url: "https://example.com/part?id=42", host: "example.com", kind: "LINK" });
  });

  it("classifies common direct image URLs", () => {
    expect(extractPostAttachment("Photo: https://cdn.example.com/car.webp?size=large")?.kind)
      .toBe("IMAGE");
  });

  it("classifies supported video hosts", () => {
    expect(extractPostAttachment("Run video https://youtu.be/abc123")?.kind).toBe("VIDEO");
  });

  it("ignores non-HTTPS URLs", () => {
    expect(extractPostAttachment("http://example.com/nope.jpg")).toBeNull();
  });

  it("strips trailing sentence punctuation", () => {
    expect(extractPostAttachment("See https://example.com/build.jpg." )?.url)
      .toBe("https://example.com/build.jpg");
  });
});
