import { describe, expect, it } from "vitest";
import { buildPublicCarLookup } from "./public-car-repository";

describe("buildPublicCarLookup", () => {
  it("requires both the requested car id and public owner handle", () => {
    expect(buildPublicCarLookup("matt", "car-123")).toEqual({
      id: "car-123",
      owner: { handle: "matt" },
    });
  });

  it("canonicalizes the public owner handle without weakening car scoping", () => {
    expect(buildPublicCarLookup("  Boosted_SVT  ", "car-123")).toEqual({
      id: "car-123",
      owner: { handle: "boosted_svt" },
    });
  });

  it("keeps owner handles isolated between otherwise identical car lookups", () => {
    expect(buildPublicCarLookup("member-a", "car-123")).not.toEqual(
      buildPublicCarLookup("member-b", "car-123"),
    );
  });
});
