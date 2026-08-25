import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("feed composer media publication order", () => {
  it("creates and owner-validates the Society post before requesting upload targets", () => {
    const source = readFileSync(new URL("./feed-composer.tsx", import.meta.url), "utf8");

    const createPostIndex = source.indexOf("const post = await createFeedPost(formData)");
    const requestUploadsIndex = source.indexOf("await requestFeedPostMediaUploads(");
    const firstNetworkUploadIndex = source.indexOf("await fetch(target.uploadUrl");

    expect(createPostIndex).toBeGreaterThan(-1);
    expect(requestUploadsIndex).toBeGreaterThan(createPostIndex);
    expect(firstNetworkUploadIndex).toBeGreaterThan(requestUploadsIndex);
  });

  it("keeps retries pinned to the already-created post instead of creating a second post", () => {
    const source = readFileSync(new URL("./feed-composer.tsx", import.meta.url), "utf8");

    expect(source).toContain("let postId = pendingPostIdRef.current");
    expect(source).toContain("if (!postId) {");
    expect(source).toContain("pendingPostIdRef.current = post.id");
    expect(source).toContain("Retry to finish only the remaining media on this same post");
  });
});
