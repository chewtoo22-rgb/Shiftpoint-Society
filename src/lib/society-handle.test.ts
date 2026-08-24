import { describe, expect, it } from "vitest";
import { normalizeSocietyHandle, validateSocietyHandle } from "./society-handle";

describe("Society handle canonicalization", () => {
  it("normalizes casing and surrounding whitespace for stable public identity", () => {
    expect(normalizeSocietyHandle("  Boosted_SVT  ")).toBe("boosted_svt");
    expect(validateSocietyHandle("  Boosted-SVT  ")).toBe("boosted-svt");
  });

  it("rejects invalid, too-short, and oversized handles", () => {
    expect(() => validateSocietyHandle("ab")).toThrow("Invalid Society handle");
    expect(() => validateSocietyHandle("bad handle")).toThrow("Invalid Society handle");
    expect(() => validateSocietyHandle("x".repeat(33))).toThrow("Invalid Society handle");
  });
});
