import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  userUpdate: vi.fn(),
  carCount: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/current-member", () => ({
  getCurrentMember: mocks.getCurrentMember,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      update: mocks.userUpdate,
    },
    car: {
      count: mocks.carCount,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { updateMemberProfile } from "./actions";

const initialState = { error: null };

function validProfileFormData() {
  const formData = new FormData();
  formData.set("handle", "Boosted_SVT");
  formData.set("displayName", "Matt's SVT");
  return formData;
}

describe("member profile onboarding boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1", handle: "old_handle" });
    mocks.userUpdate.mockResolvedValue({ id: "member-1", handle: "boosted_svt" });
    mocks.carCount.mockResolvedValue(0);
    mocks.transaction.mockImplementation(async (operations: Promise<unknown>[]) => Promise.all(operations));
  });

  it("updates only the authenticated member, canonicalizes the handle, and refreshes both public routes", async () => {
    const formData = validProfileFormData();
    formData.set("handle", "  Boosted_SVT  ");
    formData.set("bio", "Built, not bought.");
    formData.set("id", "attacker-controlled-member");

    await expect(updateMemberProfile(initialState, formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: {
        handle: "boosted_svt",
        displayName: "Matt's SVT",
        bio: "Built, not bought.",
      },
    });
    expect(mocks.userUpdate.mock.calls[0][0].where).not.toEqual({ id: "attacker-controlled-member" });
    expect(mocks.carCount).toHaveBeenCalledWith({ where: { ownerId: "member-1" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/u/old_handle");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/u/boosted_svt");
    expect(mocks.redirect).toHaveBeenCalledWith("/garage/new");
  });

  it("continues an established member into the garage when they already own a car", async () => {
    mocks.carCount.mockResolvedValue(1);

    await expect(updateMemberProfile(initialState, validProfileFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith("/garage");
  });

  it("rejects malformed profile input before identity or database work", async () => {
    const formData = validProfileFormData();
    formData.set("handle", "no spaces allowed");

    await expect(updateMemberProfile(initialState, formData)).resolves.toEqual({
      error: expect.stringContaining("Handles must be 3–32"),
    });

    expect(mocks.getCurrentMember).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns a recoverable inline error when the canonical handle is already taken", async () => {
    mocks.transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.14.0",
      }),
    );

    await expect(updateMemberProfile(initialState, validProfileFormData())).resolves.toEqual({
      error: "That Society handle is already taken",
    });

    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
