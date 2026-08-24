import { describe, expect, it } from "vitest";
import { buildPublicMemberLookup } from "./member-profile-repository";

describe("buildPublicMemberLookup", () => {
  it("constrains the public profile lookup to the requested handle", () => {
    expect(buildPublicMemberLookup("matt")).toEqual({ handle: "matt" });
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
