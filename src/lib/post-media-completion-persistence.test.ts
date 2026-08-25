import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  postFindFirst: vi.fn(),
  uploadIntentFindUnique: vi.fn(),
  postMediaFindUnique: vi.fn(),
  postMediaFindMany: vi.fn(),
  postMediaCreate: vi.fn(),
  uploadIntentUpdate: vi.fn(),
  transaction: vi.fn(),
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

import { persistPostMediaCompletion } from "./post-media-completion";

const media = {
  name: "launch.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024,
};

const objectKey = "members/member-1/post-media/upload-1.jpg";
const mediaUrl = "https://media.shiftpoint.example/upload-1.jpg";

function matchingIntent() {
  return {
    ownerId: "member-1",
    objectKey,
    mediaUrl,
    type: "IMAGE",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    originalName: "launch.jpg",
  };
}

function transactionClient() {
  return {
    postMedia: {
      findUnique: mocks.postMediaFindUnique,
      findMany: mocks.postMediaFindMany,
      create: mocks.postMediaCreate,
    },
    postMediaUploadIntent: {
      update: mocks.uploadIntentUpdate,
    },
  };
}

describe("post media completion persistence boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1" });
    mocks.postFindFirst.mockResolvedValue({ id: "post-1" });
    mocks.uploadIntentFindUnique.mockResolvedValue(matchingIntent());
    mocks.postMediaFindUnique.mockResolvedValue(null);
    mocks.postMediaFindMany.mockResolvedValue([
      { sortOrder: 0 },
      { sortOrder: 1 },
    ]);
    mocks.postMediaCreate.mockResolvedValue({
      id: "media-1",
      postId: "post-1",
      objectKey,
      sortOrder: 2,
    });
    mocks.uploadIntentUpdate.mockResolvedValue({ attachedAt: new Date() });
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient()));
  });

  it("allocates the first free attachment slot inside a serializable transaction", async () => {
    await expect(
      persistPostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).resolves.toEqual(expect.objectContaining({ id: "media-1", sortOrder: 2 }));

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]?.[1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(mocks.postMediaFindMany).toHaveBeenCalledWith({
      where: { postId: "post-1" },
      select: { sortOrder: true },
    });
    expect(mocks.postMediaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        postId: "post-1",
        objectKey,
        sortOrder: 2,
      }),
    });
  });

  it("reuses a removed middle slot instead of colliding with a later attachment", async () => {
    mocks.postMediaFindMany.mockResolvedValue([
      { sortOrder: 0 },
      { sortOrder: 2 },
      { sortOrder: 3 },
    ]);
    mocks.postMediaCreate.mockResolvedValue({
      id: "media-gap",
      postId: "post-1",
      objectKey,
      sortOrder: 1,
    });

    await expect(
      persistPostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).resolves.toEqual(expect.objectContaining({ id: "media-gap", sortOrder: 1 }));

    expect(mocks.postMediaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 1 }),
    });
  });

  it("fails before creating media when all four attachment slots are occupied", async () => {
    mocks.postMediaFindMany.mockResolvedValue([
      { sortOrder: 0 },
      { sortOrder: 1 },
      { sortOrder: 2 },
      { sortOrder: 3 },
    ]);

    await expect(
      persistPostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).rejects.toThrow("Posts support up to 4 media attachments.");

    expect(mocks.postMediaCreate).not.toHaveBeenCalled();
    expect(mocks.uploadIntentUpdate).not.toHaveBeenCalled();
  });

  it("keeps repeated completion idempotent inside the same transactional boundary", async () => {
    const existing = {
      id: "media-existing",
      postId: "post-1",
      objectKey,
      sortOrder: 1,
    };
    mocks.postMediaFindUnique.mockResolvedValue(existing);

    await expect(
      persistPostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).resolves.toEqual(existing);

    expect(mocks.postMediaFindMany).not.toHaveBeenCalled();
    expect(mocks.postMediaCreate).not.toHaveBeenCalled();
    expect(mocks.uploadIntentUpdate).toHaveBeenCalledWith({
      where: { objectKey },
      data: { attachedAt: expect.any(Date) },
    });
  });

  it("retries a bounded serialization conflict and then succeeds", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Transaction write conflict",
      {
        code: "P2034",
        clientVersion: "6.14.0",
      },
    );

    mocks.transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(async (callback) => callback(transactionClient()));

    await expect(
      persistPostMediaCompletion({ postId: "post-1", objectKey, mediaUrl, media }),
    ).resolves.toEqual(expect.objectContaining({ id: "media-1" }));

    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});
