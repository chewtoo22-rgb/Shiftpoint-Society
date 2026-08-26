import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  uploadIntentCreate: vi.fn(),
}));

vi.mock("@/lib/current-member", () => ({
  getCurrentMember: mocks.getCurrentMember,
}));

vi.mock("@/lib/db", () => ({
  db: {
    postMediaUploadIntent: {
      create: mocks.uploadIntentCreate,
    },
  },
}));

import { authorizePostMediaUploads } from "./post-media-upload";
import type { PostMediaStorageAdapter } from "./post-media-storage";

function createStorage() {
  const createUploadTarget = vi.fn().mockResolvedValue({
    uploadUrl: "https://upload.shiftpoint.example/object",
    mediaUrl: "https://media.shiftpoint.example/object",
    method: "PUT" as const,
  });

  return {
    createUploadTarget,
    storage: { createUploadTarget } satisfies PostMediaStorageAdapter,
  };
}

describe("post media upload authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1" });
    mocks.uploadIntentCreate.mockResolvedValue({ id: "intent-1" });
  });

  it("binds upload targets and intents to the authenticated member", async () => {
    const { storage, createUploadTarget } = createStorage();

    const [authorized] = await authorizePostMediaUploads(
      [{ name: "  launch.JPG  ", mimeType: " IMAGE/JPEG ", sizeBytes: 1024 }],
      storage,
    );

    expect(authorized).toEqual(
      expect.objectContaining({
        ownerId: "member-1",
        originalName: "launch.JPG",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        kind: "IMAGE",
      }),
    );
    expect(authorized.objectKey).toMatch(/^members\/member-1\/post-media\/[a-zA-Z0-9_-]+\.jpg$/);

    expect(createUploadTarget).toHaveBeenCalledWith({
      ownerId: "member-1",
      objectKey: authorized.objectKey,
      originalName: "launch.JPG",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      kind: "IMAGE",
    });
    expect(mocks.uploadIntentCreate).toHaveBeenCalledWith({
      data: {
        ownerId: "member-1",
        objectKey: authorized.objectKey,
        mediaUrl: "https://media.shiftpoint.example/object",
        type: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        originalName: "launch.JPG",
      },
    });
  });

  it("rejects invalid media before issuing an upload target or intent", async () => {
    const { storage, createUploadTarget } = createStorage();

    await expect(
      authorizePostMediaUploads(
        [{ name: "../spoof.jpg", mimeType: "image/jpeg", sizeBytes: 1024 }],
        storage,
      ),
    ).rejects.toThrow("Media file name must not contain path separators.");

    expect(createUploadTarget).not.toHaveBeenCalled();
    expect(mocks.uploadIntentCreate).not.toHaveBeenCalled();
  });

  it("does not persist an intent when storage refuses to issue a target", async () => {
    const { storage, createUploadTarget } = createStorage();
    createUploadTarget.mockRejectedValue(new Error("storage unavailable"));

    await expect(
      authorizePostMediaUploads(
        [{ name: "launch.jpg", mimeType: "image/jpeg", sizeBytes: 1024 }],
        storage,
      ),
    ).rejects.toThrow("storage unavailable");

    expect(mocks.uploadIntentCreate).not.toHaveBeenCalled();
  });

  it("surfaces intent persistence failures instead of returning an untracked authorization", async () => {
    const { storage } = createStorage();
    mocks.uploadIntentCreate.mockRejectedValue(new Error("database unavailable"));

    await expect(
      authorizePostMediaUploads(
        [{ name: "launch.jpg", mimeType: "image/jpeg", sizeBytes: 1024 }],
        storage,
      ),
    ).rejects.toThrow("database unavailable");
  });
});
