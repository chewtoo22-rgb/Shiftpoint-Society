import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  carCreate: vi.fn(),
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
    car: {
      create: mocks.carCreate,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { createGarageCar, type GarageCarActionState } from "./actions";

const initialState: GarageCarActionState = { error: null };

describe("garage car creation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentMember.mockResolvedValue({ id: "member-1", handle: "boosted_svt" });
    mocks.carCreate.mockResolvedValue({ id: "car-1" });
  });

  it("binds the new car to the authenticated member and refreshes the public garage", async () => {
    const formData = new FormData();
    formData.set("year", "2000");
    formData.set("make", "Ford");
    formData.set("model", "Contour SVT");
    formData.set("ownerId", "attacker-controlled-member");

    await expect(createGarageCar(initialState, formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.carCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: "member-1",
        year: 2000,
        make: "Ford",
        model: "Contour SVT",
      }),
    });
    expect(mocks.carCreate.mock.calls[0][0].data).not.toHaveProperty("ownerId", "attacker-controlled-member");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/garage");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/u/boosted_svt");
    expect(mocks.redirect).toHaveBeenCalledWith("/garage");
  });

  it("normalizes optional whitespace fields before persistence", async () => {
    const formData = new FormData();
    formData.set("year", "2000");
    formData.set("make", "  Ford  ");
    formData.set("model", "  Contour SVT  ");
    formData.set("trim", "   ");
    formData.set("nickname", "   ");
    formData.set("engine", "   ");
    formData.set("drivetrain", "   ");
    formData.set("powerHp", "");

    await expect(createGarageCar(initialState, formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.carCreate).toHaveBeenCalledWith({
      data: {
        ownerId: "member-1",
        year: 2000,
        make: "Ford",
        model: "Contour SVT",
        trim: null,
        nickname: null,
        engine: null,
        drivetrain: null,
        powerHp: undefined,
      },
    });
  });

  it("returns a recoverable validation error before identity lookup or database writes", async () => {
    const formData = new FormData();
    formData.set("year", "1700");
    formData.set("make", "F");
    formData.set("model", "Contour SVT");
    formData.set("powerHp", "9001");

    await expect(createGarageCar(initialState, formData)).resolves.toEqual({
      error: expect.stringContaining("Check the machine details"),
      values: {
        year: "1700",
        make: "F",
        model: "Contour SVT",
        trim: "",
        nickname: "",
        engine: "",
        drivetrain: "",
        powerHp: "9001",
      },
    });

    expect(mocks.getCurrentMember).not.toHaveBeenCalled();
    expect(mocks.carCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("bounds echoed invalid values before returning them to the onboarding form", async () => {
    const formData = new FormData();
    formData.set("year", "17000");
    formData.set("make", "M".repeat(120));
    formData.set("model", "Contour SVT");
    formData.set("engine", "E".repeat(180));
    formData.set("powerHp", "99999");

    const result = await createGarageCar(initialState, formData);

    expect(result.error).toContain("Check the machine details");
    expect(result.values).toMatchObject({
      year: "1700",
      make: "M".repeat(80),
      engine: "E".repeat(120),
      powerHp: "9999",
    });
    expect(mocks.getCurrentMember).not.toHaveBeenCalled();
    expect(mocks.carCreate).not.toHaveBeenCalled();
  });
});
