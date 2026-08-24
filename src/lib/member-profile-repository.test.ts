import { describe, expect, it } from "vitest";
import {
  buildPublicMemberLookup,
  publicMemberProfileSelect,
} from "./member-profile-repository";

describe("buildPublicMemberLookup", () => {
  it("constrains the public profile lookup to the requested handle", () => {
    expect(buildPublicMemberLookup("matt")).toEqual({ handle: "matt" });
  });

  it("canonicalizes public profile handles before lookup", () => {
    expect(buildPublicMemberLookup("  Boosted_SVT  ")).toEqual({
      handle: "boosted_svt",
    });
  });

  it("keeps otherwise identical profile lookups isolated by handle", () => {
    expect(buildPublicMemberLookup("member-a")).not.toEqual(
      buildPublicMemberLookup("member-b"),
    );
  });

  it("does not introduce client-controlled ownership selectors", () => {
    const lookup = buildPublicMemberLookup("matt") as Record<string, unknown>;

    expect(lookup).not.toHaveProperty("id");
    expect(lookup).not.toHaveProperty("ownerId");
    expect(lookup).not.toHaveProperty("authorId");
  });
});

describe("publicMemberProfileSelect", () => {
  it("keeps authentication and internal ownership fields out of the public member projection", () => {
    const memberSelect = publicMemberProfileSelect as Record<string, unknown>;
    const carSelect = publicMemberProfileSelect.cars.select as Record<string, unknown>;

    expect(memberSelect).not.toHaveProperty("id");
    expect(memberSelect).not.toHaveProperty("authSubject");
    expect(memberSelect).not.toHaveProperty("updatedAt");
    expect(memberSelect).not.toHaveProperty("posts");
    expect(memberSelect).not.toHaveProperty("comments");
    expect(memberSelect).not.toHaveProperty("reactions");
    expect(carSelect).not.toHaveProperty("ownerId");
    expect(carSelect).not.toHaveProperty("owner");
  });

  it("exposes only the public garage facts needed by the member profile", () => {
    expect(Object.keys(publicMemberProfileSelect).sort()).toEqual(
      ["avatarUrl", "bio", "cars", "createdAt", "displayName", "handle"].sort(),
    );

    expect(Object.keys(publicMemberProfileSelect.cars.select).sort()).toEqual(
      [
        "_count",
        "drivetrain",
        "engine",
        "id",
        "isVerified",
        "make",
        "model",
        "nickname",
        "powerHp",
        "quarterMileMph",
        "quarterMileSeconds",
        "trim",
        "updatedAt",
        "year",
      ].sort(),
    );
  });
});
