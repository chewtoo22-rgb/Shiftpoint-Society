import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  postFindFirst: vi.fn(),
  uploadIntentFindUnique: vi.fn(),
  transaction: vi.fn(),
  txUploadIntentFindUnique: vi.fn(),
  txUploadIntentUpdate: vi.fn(),
  txPostMediaFindUnique: vi.fn(),
  txPostMediaFindMany: vi.fn(),
  txPostMediaCreate: vi.fn(),
}));

vi.mock("@/lib/current-member", () => ({
  getCurrentMember: mocks.getCurrentMember,
}));

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findFirst: mocks.postFindFirst,
    },
    postMediaUploadIntent: {
      findUnique: mocks.uploadIntentFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));

import {
  authorizePostMediaCompletion,
  persistPostMediaCompletion,
} from "./post-media-completion";

const media = {
  name: "launch.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024,
};

const objectKey = "members/member-1/post-media/upload-1.jpg";
const mediaUrl = "https://media.shiftpoint.example/upload-1.jpg";

function matchingIntent(overrides: Record<string, unknown> = {}) {
  return {
    ownerId: "member-1",
    objectKey,
    mediaUrl,
    type: "IMAGE",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    originalName: "launch.jpg",
    ...overrides,
  };
}

function matchingExistingMedia(overrides: Record<string, unknown> = {}) {
  return {
    id: "media-1",
    postId: "post-1",
    objectKey,
    url: mediaUrl,
    type: "IMAGE",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    originalName: "launch.jpg",
    sortOrder: 0,
    createdAt: new Date("2026-08-26T00:00:00Z"),
    ...overrides,
  };
}

describe("post media completion authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1" });
    mocks.postFindFirst.mockResolvedValue({ id: "post-1" });
    mocks.uploadIntentFindUnique.mockResolvedValue(matchingIntent());
    mocks.txUploadIntentFindUnique.mockResolvedValue(matchingIntent());
    mocks.txUploadIntentUpdate.mockResolvedValue(matchingIntent());
    mocks.txPostMediaFindUnique.mockResolvedValue(null);
    mocks.txPostMediaFindMany.mockResolvedValue([]);
    mocks.txPostMediaCreate.mockResolvedValue(matchingExistingMedia());
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        postMediaUploadIntent: {
          findUnique: mocks.txUploadIntentFindUnique,
          update: mocks.txUploadIntentUpdate,
        },
        postMedia: {
          findUnique: mocks.txPostMediaFindUnique,
          findMany: mocks.txPostMediaFindMany,
          create: mocks.txPostMediaCreate,
        },
      }),
    );
  });

  it("pins the target post to the authenticated member", async () => {
    await expect(
      authorizePostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).resolves.toEqual(
      expect.objectContaining({
        postId: "post-1",
        ownerId: "member-1",
        objectKey,
        kind: "IMAGE",
      }),
    );

    expect(mocks.postFindFirst).toHaveBeenCalledWith({
      where: { id: "post-1", authorId: "member-1" },
      select: { id: true },
    });
    expect(mocks.uploadIntentFindUnique).toHaveBeenCalledWith({ where: { objectKey } });
  });

  it("fails closed when the requested post is not owned by the current member", async () => {
    mocks.postFindFirst.mockResolvedValue(null);

    await expect(
      authorizePostMediaCompletion({ postId: "other-post", objectKey, mediaUrl, media }),
    ).rejects.toThrow("Post not found for current member.");

    expect(mocks.postFindFirst).toHaveBeenCalledWith({
      where: { id: "other-post", authorId: "member-1" },
      select: { id: true },
    });
    expect(mocks.uploadIntentFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an object key outside the authenticated member namespace", async () => {
    const foreignObjectKey = "members/member-2/post-media/upload-1.jpg";

    await expect(
      authorizePostMediaCompletion({
        postId: "post-1",
        objectKey: foreignObjectKey,
        mediaUrl,
        media,
      }),
    ).rejects.toThrow("Post media object does not belong to the current member.");

    expect(mocks.uploadIntentFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an upload intent issued to another member", async () => {
    mocks.uploadIntentFindUnique.mockResolvedValue(matchingIntent({ ownerId: "member-2" }));

    await expect(
      authorizePostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).rejects.toThrow("Upload intent not found for current member.");
  });

  it("rejects completion metadata that differs from the server-issued intent", async () => {
    mocks.uploadIntentFindUnique.mockResolvedValue(matchingIntent({ sizeBytes: 2048 }));

    await expect(
      authorizePostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).rejects.toThrow("Uploaded media does not match its authorized upload intent.");
  });

  it("accepts an idempotent completion only when persisted media still matches authorization", async () => {
    const existing = matchingExistingMedia();
    mocks.txPostMediaFindUnique.mockResolvedValue(existing);

    await expect(
      persistPostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).resolves.toEqual(existing);

    expect(mocks.txUploadIntentUpdate).toHaveBeenCalledOnce();
    expect(mocks.txPostMediaCreate).not.toHaveBeenCalled();
  });

  it("fails closed when an idempotent completion finds inconsistent persisted metadata", async () => {
    mocks.txPostMediaFindUnique.mockResolvedValue(
      matchingExistingMedia({ sizeBytes: 2048 }),
    );

    await expect(
      persistPostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).rejects.toThrow(
      "Existing post media does not match its authorized upload intent.",
    );

    expect(mocks.txUploadIntentUpdate).not.toHaveBeenCalled();
    expect(mocks.txPostMediaCreate).not.toHaveBeenCalled();
  });
});
