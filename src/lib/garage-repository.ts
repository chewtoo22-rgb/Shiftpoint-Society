import { db } from "@/lib/db";
import { getCurrentMember } from "@/lib/current-member";
import { demoGarage, type GarageViewModel } from "./garage";

type GarageRecord = Awaited<ReturnType<typeof loadCar>>;

const GARAGE_SWITCHER_LIMIT = 50;

async function loadCar(ownerId: string, carId?: string) {
  return db.car.findFirst({
    where: carId ? { id: carId, ownerId } : { ownerId },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    include: {
      buildEntries: {
        orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
        take: 8,
      },
      carParts: {
        orderBy: [{ installedAt: "desc" }, { partId: "asc" }],
        include: { part: true },
      },
    },
  });
}

function formatQuarterMile(seconds: number | null, mph: number | null) {
  if (seconds == null) return "—";
  return mph == null ? `${seconds.toFixed(2)} SEC` : `${seconds.toFixed(2)} @ ${Math.round(mph)}`;
}

function buildAgeLabel(createdAt: Date) {
  const years = Math.max(0, new Date().getFullYear() - createdAt.getFullYear());
  return `${String(years).padStart(2, "0")}Y`;
}

function toGarageViewModel(car: NonNullable<GarageRecord>): GarageViewModel {
  const installed = car.carParts.filter((entry) => entry.installedAt != null);

  return {
    id: car.id,
    eyebrow: `MY GARAGE // ${car.nickname?.toUpperCase() ?? car.model.toUpperCase()}`,
    year: car.year,
    make: car.make.toUpperCase(),
    model: car.model.toUpperCase(),
    engine: car.engine?.toUpperCase() ?? "ENGINE NOT LOGGED",
    drivetrain: car.drivetrain?.toUpperCase() ?? "DRIVETRAIN NOT LOGGED",
    power: car.powerHp == null ? "—" : `${car.powerHp} HP`,
    quarterMile: formatQuarterMile(car.quarterMileSeconds, car.quarterMileMph),
    status: "ACTIVE",
    wrenchScore: car.isVerified ? 100 : Math.min(95, 40 + car.buildEntries.length * 5 + installed.length * 2),
    partsLogged: car.carParts.length,
    partsInstalled: installed.length,
    buildAge: buildAgeLabel(car.createdAt),
    lastUpdated: `Updated ${car.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    mods: car.carParts.slice(0, 8).map(({ part }) => ({
      type: part.category.toUpperCase(),
      name: `${part.brand} ${part.name}`,
      delta: part.partNumber ?? "LOGGED",
    })),
    timeline: car.buildEntries.map((entry) => ({
      date: entry.occurredAt.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase(),
      title: entry.title,
      detail: entry.body,
    })),
  };
}

export async function getGarage(carId?: string): Promise<GarageViewModel | null> {
  // Resolve identity before entering the database-fallback boundary. Redirects and
  // other authentication failures must never be swallowed into demo garage data.
  const member = await getCurrentMember();

  try {
    const car = await loadCar(member.id, carId);

    // A healthy persistence layer with no matching row means there is no garage to
    // render. Keep that distinct from infrastructure failure so first-time members
    // continue into real car onboarding instead of seeing demo data as their garage.
    if (!car) return null;

    return toGarageViewModel(car);
  } catch {
    // Phase 0 fallback keeps an authenticated garage usable before a database is attached.
    return demoGarage;
  }
}

export type GarageSwitcherResult = {
  cars: Array<{
    id: string;
    year: number;
    make: string;
    model: string;
    nickname: string | null;
  }>;
  total: number;
  isTruncated: boolean;
};

export async function getGarageSwitcher(): Promise<GarageSwitcherResult> {
  // Keep authentication fail-closed; only persistence failures may degrade to an
  // empty switcher for an already-authenticated member.
  const member = await getCurrentMember();

  try {
    const [cars, total] = await Promise.all([
      db.car.findMany({
        where: { ownerId: member.id },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: GARAGE_SWITCHER_LIMIT,
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          nickname: true,
        },
      }),
      db.car.count({ where: { ownerId: member.id } }),
    ]);

    return {
      cars,
      total,
      isTruncated: total > cars.length,
    };
  } catch {
    return { cars: [], total: 0, isTruncated: false };
  }
}

export async function getPrimaryGarage(): Promise<GarageViewModel> {
  return (await getGarage()) ?? demoGarage;
}
