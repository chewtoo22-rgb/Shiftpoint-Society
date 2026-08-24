import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userCreate: vi.fn(),
  carFindFirst: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
      create: mocks.userCreate,
    },
    car: {
      findFirst: mocks.carFindFirst,
    },
  },
}));

import {
  getCurrentMember,
  getOptionalCurrentMember,
  requireOwnedCar,
} from "./current-member";

describe("current member identity boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("keeps anonymous optional-member reads out of the database", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(getOptionalCurrentMember()).resolves.toBeNull();
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("requires both an auth subject and provider handle before bootstrapping identity", async () => {
    mocks.auth.mockResolvedValue({
      user: { authSubject: "provider:123", handle: undefined },
    });

    await expect(getCurrentMember()).rejects.toThrow("redirect:/sign-in");
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("updates mutable profile fields without overwriting an existing Society handle", async () => {
    const existing = {
      id: "member-1",
      authSubject: "provider:123",
      handle: "chosen-handle",
      displayName: "Chosen Name",
      avatarUrl: "https://example.test/existing.png",
    };
    mocks.auth.mockResolvedValue({
      user: {
        authSubject: "provider:123",
        handle: "provider-handle",
        name: "Provider Name",
        image: "https://example.test/provider.png",
      },
    });
    mocks.userFindUnique.mockResolvedValue(existing);
    mocks.userUpdate.mockResolvedValue({
      ...existing,
      avatarUrl: "https://example.test/provider.png",
    });

    await getCurrentMember();

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { authSubject: "provider:123" },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: {
        displayName: "Chosen Name",
        avatarUrl: "https://example.test/provider.png",
      },
    });
    const update = mocks.userUpdate.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    expect(update).not.toHaveProperty("handle");
    expect(update).not.toHaveProperty("authSubject");
  });

  it("bootstraps a new member from trusted session identity with a canonical handle", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        authSubject: "provider:456",
        handle: "Bootstrap-Handle",
        name: "Bootstrap Name",
        image: null,
      },
    });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({ id: "member-2" });

    await getCurrentMember();

    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        authSubject: "provider:456",
        handle: "bootstrap-handle",
        displayName: "Bootstrap Name",
        avatarUrl: undefined,
      },
    });
  });

  it("fails closed instead of persisting an invalid provider bootstrap handle", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        authSubject: "provider:invalid",
        handle: "bad provider handle",
      },
    });
    mocks.userFindUnique.mockResolvedValue(null);

    await expect(getCurrentMember()).rejects.toThrow("Invalid Society handle");
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("scopes owned-car lookup to the authenticated member id", async () => {
    const member = {
      id: "member-7",
      authSubject: "provider:777",
      handle: "owner",
      displayName: "Owner",
      avatarUrl: null,
    };
    mocks.auth.mockResolvedValue({
      user: { authSubject: "provider:777", handle: "provider-owner" },
    });
    mocks.userFindUnique.mockResolvedValue(member);
    mocks.userUpdate.mockResolvedValue(member);
    mocks.carFindFirst.mockResolvedValue({ id: "car-9", ownerId: "member-7" });

    await expect(requireOwnedCar("car-9")).resolves.toEqual({
      member,
      car: { id: "car-9", ownerId: "member-7" },
    });
    expect(mocks.carFindFirst).toHaveBeenCalledWith({
      where: { id: "car-9", ownerId: "member-7" },
      select: { id: true, ownerId: true },
    });
  });

  it("fails closed when the requested car is not owned by the current member", async () => {
    const member = {
      id: "member-8",
      authSubject: "provider:888",
      handle: "owner-8",
      displayName: "Owner 8",
      avatarUrl: null,
    };
    mocks.auth.mockResolvedValue({
      user: { authSubject: "provider:888", handle: "provider-owner-8" },
    });
    mocks.userFindUnique.mockResolvedValue(member);
    mocks.userUpdate.mockResolvedValue(member);
    mocks.carFindFirst.mockResolvedValue(null);

    await expect(requireOwnedCar("someone-elses-car")).rejects.toThrow(
      "Garage car not found for current member",
    );
    expect(mocks.carFindFirst).toHaveBeenCalledWith({
      where: { id: "someone-elses-car", ownerId: "member-8" },
      select: { id: true, ownerId: true },
    });
  });
});
