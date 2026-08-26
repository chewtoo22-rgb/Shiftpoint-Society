import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
}));

import {
  buildPublicMemberLookup,
  buildValidatedPublicMemberLookup,
  getPublicMemberProfile,
  PUBLIC_MEMBER_GARAGE_MAX_CARS,
  publicMemberProfileSelect,
} from "./member-profile-repository";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildPublicMemberLookup", () => {
  it("constrains the public profile lookup to the requested handle", () => {
    expect(buildPublicMemberLookup("matt")).toEqual({ handle: "matt" });
  });

  it("canonicalizes public profile handles before lookup", () => {
    expect(buildPublicMemberLookup("  Boosted_SVT  ")).toEqual({
      handle: "boosted_svt",
    });
  });

  it("keeps otherwise identical profile lookups isolated by handle", () => {
    expect(buildPublicMemberLookup("member-a")).not.toEqual(
      buildPublicMemberLookup("member-b"),
    );
  });

  it("does not introduce client-controlled ownership selectors", () => {
    const lookup = buildPublicMemberLookup("matt") as Record<string, unknown>;

    expect(lookup).not.toHaveProperty("id");
    expect(lookup).not.toHaveProperty("ownerId");
    expect(lookup).not.toHaveProperty("authorId");
  });
});

describe("buildValidatedPublicMemberLookup", () => {
  it("canonicalizes valid public handles", () => {
    expect(buildValidatedPublicMemberLookup("  Boosted_SVT  ")).toEqual({
      handle: "boosted_svt",
    });
  });

  it("fails closed for malformed public handles before a database lookup", () => {
    expect(buildValidatedPublicMemberLookup("ab")).toBeNull();
    expect(buildValidatedPublicMemberLookup("bad handle")).toBeNull();
    expect(buildValidatedPublicMemberLookup("bad/handle")).toBeNull();
  });
});

describe("getPublicMemberProfile", () => {
  it("keeps malformed public handles out of the database entirely", async () => {
    await expect(getPublicMemberProfile("bad/handle")).resolves.toBeNull();
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("uses the validated canonical handle and narrow public projection", async () => {
    const publicMember = {
      handle: "boosted_svt",
      displayName: "Boosted SVT",
      bio: null,
      avatarUrl: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      _count: { cars: 0 },
      cars: [],
    };
    mocks.userFindUnique.mockResolvedValue(publicMember);

    await expect(getPublicMemberProfile("  Boosted_SVT  ")).resolves.toBe(publicMember);
    expect(mocks.userFindUnique).toHaveBeenCalledTimes(1);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { handle: "boosted_svt" },
      select: publicMemberProfileSelect,
    });
  });
});

describe("publicMemberProfileSelect", () => {
  it("keeps authentication and internal ownership fields out of the public member projection", () => {
    const memberSelect = publicMemberProfileSelect as Record<string, unknown>;
    const carSelect = publicMemberProfileSelect.cars.select as Record<string, unknown>;

    expect(memberSelect).not.toHaveProperty("id");
    expect(memberSelect).not.toHaveProperty("authSubject");
    expect(memberSelect).not.toHaveProperty("updatedAt");
    expect(memberSelect).not.toHaveProperty("posts");
    expect(memberSelect).not.toHaveProperty("comments");
    expect(memberSelect).not.toHaveProperty("reactions");
    expect(carSelect).not.toHaveProperty("ownerId");
    expect(carSelect).not.toHaveProperty("owner");
  });

  it("exposes only the public garage facts needed by the member profile", () => {
    expect(Object.keys(publicMemberProfileSelect).sort()).toEqual(
      ["_count", "avatarUrl", "bio", "cars", "createdAt", "displayName", "handle"].sort(),
    );

    expect(Object.keys(publicMemberProfileSelect.cars.select).sort()).toEqual(
      [
        "_count",
        "drivetrain",
        "engine",
        "id",
        "isVerified",
        "make",
        "model",
        "nickname",
        "powerHp",
        "quarterMileMph",
        "quarterMileSeconds",
        "trim",
        "updatedAt",
        "year",
      ].sort(),
    );
  });

  it("bounds public garage rows while retaining the total car count", () => {
    expect(publicMemberProfileSelect.cars.take).toBe(PUBLIC_MEMBER_GARAGE_MAX_CARS);
    expect(PUBLIC_MEMBER_GARAGE_MAX_CARS).toBe(50);
    expect(publicMemberProfileSelect._count).toEqual({ select: { cars: true } });
  });

  it("orders bounded public garage rows deterministically", () => {
    expect(publicMemberProfileSelect.cars.orderBy).toEqual([
      { updatedAt: "desc" },
      { id: "asc" },
    ]);
  });
});
