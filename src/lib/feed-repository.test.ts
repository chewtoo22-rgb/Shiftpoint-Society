import { describe, expect, it } from "vitest";

import { buildCommunityFeedPostWhere } from "./feed-repository";

describe("buildCommunityFeedPostWhere", () => {
  it("constrains the detail lookup to the requested post id", () => {
    expect(buildCommunityFeedPostWhere("post-123")).toEqual({ id: "post-123" });
  });

  it("does not add client-controlled ownership constraints to a public post lookup", () => {
    const where = buildCommunityFeedPostWhere("post-public");

    expect(Object.keys(where)).toEqual(["id"]);
    expect(where).not.toHaveProperty("authorId");
    expect(where).not.toHaveProperty("carId");
  });
});
