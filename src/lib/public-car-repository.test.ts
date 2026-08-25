import { describe, expect, it } from "vitest";
import {
  buildPublicCarLookup,
  publicCarBuildSelect,
} from "./public-car-repository";

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

describe("publicCarBuildSelect", () => {
  it("exposes an explicit public build allowlist without internal ownership fields", () => {
    expect(Object.keys(publicCarBuildSelect).sort()).toEqual(
      [
        "_count",
        "buildEntries",
        "carParts",
        "createdAt",
        "drivetrain",
        "engine",
        "heroImageUrl",
        "id",
        "isVerified",
        "make",
        "model",
        "nickname",
        "owner",
        "posts",
        "powerHp",
        "quarterMileMph",
        "quarterMileSeconds",
        "torqueLbFt",
        "trim",
        "updatedAt",
        "year",
      ].sort(),
    );

    expect(publicCarBuildSelect).not.toHaveProperty("ownerId");
    expect(publicCarBuildSelect).not.toHaveProperty("userId");
    expect(publicCarBuildSelect).not.toHaveProperty("authSubject");
  });

  it("limits the public owner projection to display identity", () => {
    expect(publicCarBuildSelect.owner.select).toEqual({
      handle: true,
      displayName: true,
    });
    expect(publicCarBuildSelect.owner.select).not.toHaveProperty("id");
    expect(publicCarBuildSelect.owner.select).not.toHaveProperty("authSubject");
  });

  it("keeps related public build data on narrow projections", () => {
    expect(publicCarBuildSelect.buildEntries.take).toBe(20);
    expect(publicCarBuildSelect.carParts.take).toBe(24);
    expect(publicCarBuildSelect.posts.take).toBe(6);

    expect(publicCarBuildSelect.buildEntries.select).not.toHaveProperty("carId");
    expect(publicCarBuildSelect.carParts.select).not.toHaveProperty("carId");
    expect(publicCarBuildSelect.posts.select).not.toHaveProperty("authorId");
    expect(publicCarBuildSelect.posts.select).not.toHaveProperty("carId");
  });

  it("orders related public build data deterministically when timestamps tie", () => {
    expect(publicCarBuildSelect.buildEntries.orderBy).toEqual([
      { occurredAt: "desc" },
      { id: "asc" },
    ]);
    expect(publicCarBuildSelect.carParts.orderBy).toEqual([
      { installedAt: "desc" },
      { partId: "asc" },
    ]);
    expect(publicCarBuildSelect.posts.orderBy).toEqual([
      { createdAt: "desc" },
      { id: "asc" },
    ]);
  });
});
