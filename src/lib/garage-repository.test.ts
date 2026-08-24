import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  carFindFirst: vi.fn(),
  carFindMany: vi.fn(),
}));

vi.mock("@/lib/current-member", () => ({
  getCurrentMember: mocks.getCurrentMember,
}));

vi.mock("@/lib/db", () => ({
  db: {
    car: {
      findFirst: mocks.carFindFirst,
      findMany: mocks.carFindMany,
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
  });

  it("still degrades authenticated garage reads when persistence is unavailable", async () => {
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1" });
    mocks.carFindFirst.mockRejectedValue(new Error("database unavailable"));

    await expect(getGarage()).resolves.toEqual(demoGarage);
    expect(mocks.carFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "member-1" } }),
    );
  });

  it("still degrades the authenticated switcher when persistence is unavailable", async () => {
    mocks.getCurrentMember.mockResolvedValue({ id: "member-2" });
    mocks.carFindMany.mockRejectedValue(new Error("database unavailable"));

    await expect(getGarageSwitcher()).resolves.toEqual([]);
    expect(mocks.carFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "member-2" } }),
    );
  });
});
