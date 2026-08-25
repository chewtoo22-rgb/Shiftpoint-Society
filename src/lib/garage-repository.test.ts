import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  carFindFirst: vi.fn(),
  carFindMany: vi.fn(),
  carCount: vi.fn(),
}));

vi.mock("@/lib/current-member", () => ({
  getCurrentMember: mocks.getCurrentMember,
}));

vi.mock("@/lib/db", () => ({
  db: {
    car: {
      findFirst: mocks.carFindFirst,
      findMany: mocks.carFindMany,
      count: mocks.carCount,
    },
  },
}));

import { demoGarage } from "./garage";
import { getGarage, getGarageSwitcher } from "./garage-repository";

describe("garage repository authentication boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not swallow authentication failures into demo garage data", async () => {
    mocks.getCurrentMember.mockRejectedValue(new Error("redirect:/sign-in"));

    await expect(getGarage()).rejects.toThrow("redirect:/sign-in");
    expect(mocks.carFindFirst).not.toHaveBeenCalled();
  });

  it("does not swallow authentication failures into an empty garage switcher", async () => {
    mocks.getCurrentMember.mockRejectedValue(new Error("redirect:/sign-in"));

    await expect(getGarageSwitcher()).rejects.toThrow("redirect:/sign-in");
    expect(mocks.carFindMany).not.toHaveBeenCalled();
    expect(mocks.carCount).not.toHaveBeenCalled();
  });

  it("pins an explicitly selected car to the authenticated owner and fails closed when absent", async () => {
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1" });
    mocks.carFindFirst.mockResolvedValue(null);

    await expect(getGarage("car-from-request")).resolves.toBeNull();
    expect(mocks.carFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "car-from-request", ownerId: "member-1" },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("keeps a healthy empty garage distinct from demo fallback data", async () => {
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1" });
    mocks.carFindFirst.mockResolvedValue(null);

    await expect(getGarage()).resolves.toBeNull();
    expect(mocks.carFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "member-1" } }),
    );
  });

  it("still degrades authenticated garage reads when persistence is unavailable", async () => {
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1" });
    mocks.carFindFirst.mockRejectedValue(new Error("database unavailable"));

    await expect(getGarage()).resolves.toEqual(demoGarage);
    expect(mocks.carFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "member-1" } }),
    );
  });

  it("bounds and deterministically orders the authenticated garage switcher", async () => {
    mocks.getCurrentMember.mockResolvedValue({ id: "member-2" });
    mocks.carFindMany.mockResolvedValue([]);
    mocks.carCount.mockResolvedValue(0);

    await expect(getGarageSwitcher()).resolves.toEqual({
      cars: [],
      total: 0,
      isTruncated: false,
    });
    expect(mocks.carFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: "member-2" },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 50,
      }),
    );
    expect(mocks.carCount).toHaveBeenCalledWith({ where: { ownerId: "member-2" } });
  });

  it("reports when the owner-scoped switcher is truncated", async () => {
    mocks.getCurrentMember.mockResolvedValue({ id: "member-2" });
    mocks.carFindMany.mockResolvedValue([
      { id: "car-1", year: 2000, make: "Ford", model: "Contour", nickname: "SVT" },
    ]);
    mocks.carCount.mockResolvedValue(51);

    await expect(getGarageSwitcher()).resolves.toEqual({
      cars: [{ id: "car-1", year: 2000, make: "Ford", model: "Contour", nickname: "SVT" }],
      total: 51,
      isTruncated: true,
    });
  });

  it("still degrades the authenticated switcher when persistence is unavailable", async () => {
    mocks.getCurrentMember.mockResolvedValue({ id: "member-2" });
    mocks.carFindMany.mockRejectedValue(new Error("database unavailable"));
    mocks.carCount.mockResolvedValue(0);

    await expect(getGarageSwitcher()).resolves.toEqual({
      cars: [],
      total: 0,
      isTruncated: false,
    });
    expect(mocks.carFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "member-2" } }),
    );
  });
});
