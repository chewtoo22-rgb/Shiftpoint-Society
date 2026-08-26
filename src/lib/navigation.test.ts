import { describe, expect, it } from "vitest";
import { isPrimaryNavigationActive } from "./navigation";

describe("isPrimaryNavigationActive", () => {
  it("marks the exact destination active", () => {
    expect(isPrimaryNavigationActive("/garage", "/garage")).toBe(true);
  });

  it("keeps nested product routes attached to their primary destination", () => {
    expect(isPrimaryNavigationActive("/garage/new", "/garage")).toBe(true);
    expect(isPrimaryNavigationActive("/feed/post-123", "/feed")).toBe(true);
  });

  it("does not match similar route prefixes", () => {
    expect(isPrimaryNavigationActive("/garage-sale", "/garage")).toBe(false);
    expect(isPrimaryNavigationActive("/profiles", "/profile")).toBe(false);
  });
});
