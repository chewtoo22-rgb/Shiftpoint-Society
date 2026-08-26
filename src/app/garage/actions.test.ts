import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOwnedCar: vi.fn(),
  buildEntryCreate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/current-member", () => ({
  requireOwnedCar: mocks.requireOwnedCar,
}));

vi.mock("@/lib/db", () => ({
  db: {
    buildEntry: {
      create: mocks.buildEntryCreate,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { addBuildUpdate, type BuildUpdateActionState } from "./actions";

const initialState: BuildUpdateActionState = { error: null };

describe("build update ownership and integrity boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOwnedCar.mockResolvedValue({
      member: { id: "member-1", handle: "boosted_svt" },
      car: { id: "car-1" },
    });
    mocks.buildEntryCreate.mockResolvedValue({ id: "entry-1", carId: "car-1" });
  });

  it("requires server-side car ownership before persisting a build update", async () => {
    mocks.requireOwnedCar.mockRejectedValue(new Error("not found"));

    const formData = new FormData();
    formData.set("carId", "foreign-car");
    formData.set("title", "Dyno baseline");
    formData.set("body", "Established a clean baseline before the next round of changes.");

    await expect(addBuildUpdate(initialState, formData)).rejects.toThrow("not found");

    expect(mocks.requireOwnedCar).toHaveBeenCalledWith("foreign-car");
    expect(mocks.buildEntryCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only car id before ownership lookup or persistence", async () => {
    const formData = new FormData();
    formData.set("carId", "   ");
    formData.set("title", "Dyno baseline");
    formData.set("body", "Established a clean baseline before the next round of changes.");

    const result = await addBuildUpdate(initialState, formData);

    expect(result.error).toBe("Check the build update. Fix the highlighted fields and try again.");
    expect(mocks.requireOwnedCar).not.toHaveBeenCalled();
    expect(mocks.buildEntryCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("normalizes update text and writes only to the owned car", async () => {
    const formData = new FormData();
    formData.set("carId", "car-1");
    formData.set("title", "  Dyno baseline  ");
    formData.set("body", "  Established a clean baseline before the next round of changes.  ");

    await expect(addBuildUpdate(initialState, formData)).resolves.toEqual({
      error: null,
      success: true,
    });

    expect(mocks.requireOwnedCar).toHaveBeenCalledWith("car-1");
    expect(mocks.buildEntryCreate).toHaveBeenCalledWith({
      data: {
        carId: "car-1",
        title: "Dyno baseline",
        body: "Established a clean baseline before the next round of changes.",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/garage");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/u/boosted_svt");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/u/boosted_svt/cars/car-1");
  });

  it("returns field-specific validation state before ownership lookup or persistence", async () => {
    const formData = new FormData();
    formData.set("carId", "car-1");
    formData.set("title", "x");
    formData.set("body", "x");

    const result = await addBuildUpdate(initialState, formData);

    expect(result.error).toBe("Check the build update. Fix the highlighted fields and try again.");
    expect(result.values).toEqual({ title: "x", body: "x" });
    expect(result.fieldErrors?.title?.length).toBeGreaterThan(0);
    expect(result.fieldErrors?.body?.length).toBeGreaterThan(0);
    expect(mocks.requireOwnedCar).not.toHaveBeenCalled();
    expect(mocks.buildEntryCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not invent field errors for a valid field when another field is invalid", async () => {
    const formData = new FormData();
    formData.set("carId", "car-1");
    formData.set("title", "Dyno baseline");
    formData.set("body", "x");

    const result = await addBuildUpdate(initialState, formData);

    expect(result.fieldErrors?.title).toBeUndefined();
    expect(result.fieldErrors?.body?.length).toBeGreaterThan(0);
    expect(mocks.requireOwnedCar).not.toHaveBeenCalled();
    expect(mocks.buildEntryCreate).not.toHaveBeenCalled();
  });

  it("bounds echoed validation values before returning them to the client", async () => {
    const formData = new FormData();
    formData.set("carId", "car-1");
    formData.set("title", "t".repeat(121));
    formData.set("body", "b".repeat(4001));

    const result = await addBuildUpdate(initialState, formData);

    expect(result.error).toBeTruthy();
    expect(result.values?.title).toHaveLength(120);
    expect(result.values?.body).toHaveLength(4000);
    expect(result.fieldErrors?.title?.length).toBeGreaterThan(0);
    expect(result.fieldErrors?.body?.length).toBeGreaterThan(0);
    expect(mocks.requireOwnedCar).not.toHaveBeenCalled();
    expect(mocks.buildEntryCreate).not.toHaveBeenCalled();
  });
});
