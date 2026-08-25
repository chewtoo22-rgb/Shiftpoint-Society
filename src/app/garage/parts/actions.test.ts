import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOwnedCar: vi.fn(),
  partFindFirst: vi.fn(),
  partCreate: vi.fn(),
  carPartUpsert: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/current-member", () => ({
  requireOwnedCar: mocks.requireOwnedCar,
}));

vi.mock("@/lib/db", () => ({
  db: {
    part: {
      findFirst: mocks.partFindFirst,
      create: mocks.partCreate,
    },
    carPart: {
      upsert: mocks.carPartUpsert,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { addInstalledPart } from "./actions";

const initialState = { error: null };

describe("installed parts ledger boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOwnedCar.mockResolvedValue({
      member: { id: "member-1", handle: "boosted_svt" },
      car: { id: "car-1" },
    });
    mocks.partFindFirst.mockResolvedValue({ id: "part-1" });
    mocks.carPartUpsert.mockResolvedValue({ carId: "car-1", partId: "part-1" });
  });

  it("requires server-side car ownership before touching the shared parts catalog", async () => {
    mocks.requireOwnedCar.mockRejectedValue(new Error("not found"));

    const formData = new FormData();
    formData.set("carId", "foreign-car");
    formData.set("brand", "Ford Performance");
    formData.set("name", "Cold Air Intake");
    formData.set("category", "Intake");

    await expect(addInstalledPart(initialState, formData)).rejects.toThrow("not found");

    expect(mocks.requireOwnedCar).toHaveBeenCalledWith("foreign-car");
    expect(mocks.partFindFirst).not.toHaveBeenCalled();
    expect(mocks.partCreate).not.toHaveBeenCalled();
    expect(mocks.carPartUpsert).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("normalizes ledger input, reuses a case-insensitive catalog match, and scopes the upsert to the owned car", async () => {
    const formData = new FormData();
    formData.set("carId", "car-1");
    formData.set("brand", "  Ford Performance  ");
    formData.set("name", "  Cold Air Intake  ");
    formData.set("category", "  Intake  ");
    formData.set("partNumber", "  M-9603-SVT  ");
    formData.set("notes", "  Installed for test day  ");

    const state = await addInstalledPart(initialState, formData);

    expect(state).toEqual({ error: null, success: true });
    expect(mocks.requireOwnedCar).toHaveBeenCalledWith("car-1");
    expect(mocks.partFindFirst).toHaveBeenCalledWith({
      where: {
        brand: { equals: "Ford Performance", mode: "insensitive" },
        name: { equals: "Cold Air Intake", mode: "insensitive" },
        partNumber: { equals: "M-9603-SVT", mode: "insensitive" },
      },
    });
    expect(mocks.partCreate).not.toHaveBeenCalled();
    expect(mocks.carPartUpsert).toHaveBeenCalledWith({
      where: { carId_partId: { carId: "car-1", partId: "part-1" } },
      update: { notes: "Installed for test day", installedAt: expect.any(Date) },
      create: {
        carId: "car-1",
        partId: "part-1",
        notes: "Installed for test day",
        installedAt: expect.any(Date),
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/garage");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/u/boosted_svt");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/u/boosted_svt/cars/car-1");
  });

  it("matches catalog parts without a part number using the same case-insensitive identity", async () => {
    const formData = new FormData();
    formData.set("carId", "car-1");
    formData.set("brand", "Bilstein");
    formData.set("name", "B8 Performance Plus");
    formData.set("category", "Suspension");

    await addInstalledPart(initialState, formData);

    expect(mocks.partFindFirst).toHaveBeenCalledWith({
      where: {
        brand: { equals: "Bilstein", mode: "insensitive" },
        name: { equals: "B8 Performance Plus", mode: "insensitive" },
        partNumber: null,
      },
    });
    expect(mocks.partCreate).not.toHaveBeenCalled();
  });

  it("creates a catalog part only after ownership succeeds when no match exists", async () => {
    mocks.partFindFirst.mockResolvedValue(null);
    mocks.partCreate.mockResolvedValue({ id: "part-new" });

    const formData = new FormData();
    formData.set("carId", "car-1");
    formData.set("brand", "Bilstein");
    formData.set("name", "B8 Performance Plus");
    formData.set("category", "Suspension");

    await addInstalledPart(initialState, formData);

    expect(mocks.requireOwnedCar).toHaveBeenCalledBefore(mocks.partFindFirst);
    expect(mocks.partCreate).toHaveBeenCalledWith({
      data: {
        brand: "Bilstein",
        name: "B8 Performance Plus",
        category: "Suspension",
        partNumber: null,
      },
    });
    expect(mocks.carPartUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { carId_partId: { carId: "car-1", partId: "part-new" } },
      }),
    );
  });

  it("returns recoverable field-specific validation state before ownership lookup or persistence", async () => {
    const formData = new FormData();
    formData.set("carId", "car-1");
    formData.set("brand", "B".repeat(100));
    formData.set("name", "x");
    formData.set("category", "x");
    formData.set("partNumber", "P".repeat(100));
    formData.set("notes", "n".repeat(600));

    const state = await addInstalledPart(initialState, formData);

    expect(state.error).toMatch(/fix the highlighted fields/i);
    expect(state.success).toBeUndefined();
    expect(state.values).toEqual({
      brand: "B".repeat(80),
      name: "x",
      category: "x",
      partNumber: "P".repeat(80),
      notes: "n".repeat(500),
    });
    expect(state.fieldErrors?.brand?.length).toBeGreaterThan(0);
    expect(state.fieldErrors?.name?.length).toBeGreaterThan(0);
    expect(state.fieldErrors?.category?.length).toBeGreaterThan(0);
    expect(state.fieldErrors?.partNumber?.length).toBeGreaterThan(0);
    expect(state.fieldErrors?.notes?.length).toBeGreaterThan(0);
    expect(mocks.requireOwnedCar).not.toHaveBeenCalled();
    expect(mocks.partFindFirst).not.toHaveBeenCalled();
    expect(mocks.partCreate).not.toHaveBeenCalled();
    expect(mocks.carPartUpsert).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not report valid optional ledger fields as invalid when required fields fail", async () => {
    const formData = new FormData();
    formData.set("carId", "car-1");
    formData.set("brand", "Bilstein");
    formData.set("name", "x");
    formData.set("category", "x");
    formData.set("partNumber", "24-143981");
    formData.set("notes", "Rear dampers");

    const state = await addInstalledPart(initialState, formData);

    expect(state.fieldErrors?.name?.length).toBeGreaterThan(0);
    expect(state.fieldErrors?.category?.length).toBeGreaterThan(0);
    expect(state.fieldErrors?.brand).toBeUndefined();
    expect(state.fieldErrors?.partNumber).toBeUndefined();
    expect(state.fieldErrors?.notes).toBeUndefined();
    expect(mocks.requireOwnedCar).not.toHaveBeenCalled();
  });
});
