import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  requireOwnedCar: vi.fn(),
  postCreate: vi.fn(),
  postFindUnique: vi.fn(),
  commentCreate: vi.fn(),
  reactionFindUnique: vi.fn(),
  reactionCreate: vi.fn(),
  reactionDelete: vi.fn(),
  revalidatePath: vi.fn(),
  persistPostMediaCompletion: vi.fn(),
  createPostMediaCompletionGrant: vi.fn(),
  verifyPostMediaCompletionGrant: vi.fn(),
  createConfiguredPostMediaStorageAdapter: vi.fn(),
  authorizePostMediaUploads: vi.fn(),
}));

vi.mock("@/lib/current-member", () => ({
  getCurrentMember: mocks.getCurrentMember,
  requireOwnedCar: mocks.requireOwnedCar,
}));

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      create: mocks.postCreate,
      findUnique: mocks.postFindUnique,
    },
    comment: { create: mocks.commentCreate },
    reaction: {
      findUnique: mocks.reactionFindUnique,
      create: mocks.reactionCreate,
      delete: mocks.reactionDelete,
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/post-media-completion", () => ({
  persistPostMediaCompletion: mocks.persistPostMediaCompletion,
}));
vi.mock("@/lib/post-media-completion-token", () => ({
  createPostMediaCompletionGrant: mocks.createPostMediaCompletionGrant,
  verifyPostMediaCompletionGrant: mocks.verifyPostMediaCompletionGrant,
}));
vi.mock("@/lib/post-media-http-storage", () => ({
  createConfiguredPostMediaStorageAdapter: mocks.createConfiguredPostMediaStorageAdapter,
}));
vi.mock("@/lib/post-media-policy", () => ({
  POST_MEDIA_LIMITS: { maxFilesPerPost: 4 },
}));
vi.mock("@/lib/post-media-upload", () => ({
  authorizePostMediaUploads: mocks.authorizePostMediaUploads,
}));

import { addFeedComment, createFeedPost, toggleFeedReaction } from "./actions";

describe("feed authenticated write boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1", handle: "boosted_svt" });
    mocks.requireOwnedCar.mockResolvedValue({
      member: { id: "member-1", handle: "boosted_svt" },
      car: { id: "car-1" },
    });
    mocks.postCreate.mockResolvedValue({ id: "post-1" });
    mocks.postFindUnique.mockResolvedValue({ id: "post-1" });
    mocks.reactionFindUnique.mockResolvedValue(null);
  });

  it("pins new posts to the authenticated member and an owned car", async () => {
    const formData = new FormData();
    formData.set("body", "  Fresh dyno numbers are in.  ");
    formData.set("kind", "DYNO");
    formData.set("carId", "car-1");
    formData.set("authorId", "attacker-member");

    await expect(createFeedPost(formData)).resolves.toEqual({ id: "post-1" });

    expect(mocks.requireOwnedCar).toHaveBeenCalledWith("car-1");
    expect(mocks.postCreate).toHaveBeenCalledWith({
      data: {
        authorId: "member-1",
        carId: "car-1",
        body: "Fresh dyno numbers are in.",
        kind: "DYNO",
      },
      select: { id: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feed");
  });

  it("fails closed before post persistence when the requested car is not owned", async () => {
    mocks.requireOwnedCar.mockRejectedValue(new Error("not found"));
    const formData = new FormData();
    formData.set("body", "Trying to attach somebody else's machine");
    formData.set("kind", "GENERAL");
    formData.set("carId", "foreign-car");

    await expect(createFeedPost(formData)).rejects.toThrow("not found");
    expect(mocks.postCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("binds comments to the authenticated member and trims comment text", async () => {
    const formData = new FormData();
    formData.set("postId", "post-1");
    formData.set("body", "  Nice build.  ");
    formData.set("authorId", "attacker-member");

    await addFeedComment(formData);

    expect(mocks.commentCreate).toHaveBeenCalledWith({
      data: { postId: "post-1", authorId: "member-1", body: "Nice build." },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feed");
  });

  it("does not create comments for missing posts", async () => {
    mocks.postFindUnique.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("postId", "missing-post");
    formData.set("body", "No target here");

    await expect(addFeedComment(formData)).rejects.toThrow("Post not found");
    expect(mocks.commentCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("keys reactions to the authenticated member instead of client identity", async () => {
    const formData = new FormData();
    formData.set("postId", "post-1");
    formData.set("type", "WRENCH");
    formData.set("userId", "attacker-member");

    await toggleFeedReaction(formData);

    expect(mocks.reactionCreate).toHaveBeenCalledWith({
      data: { postId: "post-1", userId: "member-1", type: "WRENCH" },
    });
    expect(mocks.reactionDelete).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feed");
  });

  it("removes only the authenticated member's exact existing reaction", async () => {
    mocks.reactionFindUnique.mockResolvedValue({ id: "reaction-1" });
    const formData = new FormData();
    formData.set("postId", "post-1");
    formData.set("type", "FIRE");

    await toggleFeedReaction(formData);

    const key = {
      postId_userId_type: { postId: "post-1", userId: "member-1", type: "FIRE" },
    };
    expect(mocks.reactionFindUnique).toHaveBeenCalledWith({ where: key });
    expect(mocks.reactionDelete).toHaveBeenCalledWith({ where: key });
    expect(mocks.reactionCreate).not.toHaveBeenCalled();
  });
});
