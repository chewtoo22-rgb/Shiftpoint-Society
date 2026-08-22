import { describe, expect, it } from "vitest";

import { authorizePostMediaOrphanOperator } from "./post-media-orphan-operator-auth";

describe("authorizePostMediaOrphanOperator", () => {
  it("accepts the configured bearer token", () => {
    expect(authorizePostMediaOrphanOperator("Bearer operator-secret", "operator-secret")).toBe(true);
  });

  it("fails closed when the server token is missing", () => {
    expect(authorizePostMediaOrphanOperator("Bearer operator-secret", undefined)).toBe(false);
  });

  it("rejects missing or non-bearer authorization", () => {
    expect(authorizePostMediaOrphanOperator(null, "operator-secret")).toBe(false);
    expect(authorizePostMediaOrphanOperator("Basic operator-secret", "operator-secret")).toBe(false);
  });

  it("rejects the wrong bearer token", () => {
    expect(authorizePostMediaOrphanOperator("Bearer wrong-secret", "operator-secret")).toBe(false);
  });

  it("trims configured and presented token whitespace", () => {
    expect(authorizePostMediaOrphanOperator("Bearer   operator-secret  ", "  operator-secret  ")).toBe(true);
  });
});
