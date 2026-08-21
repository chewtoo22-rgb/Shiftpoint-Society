import { db } from "@/lib/db";
import { getCurrentMember } from "@/lib/current-member";
import { demoGarage, type GarageViewModel } from "@/lib/garage";

type GarageRecord = Awaited<ReturnType<typeof loadCar>>;

async function loadCar(ownerId: string, carId?: string) {
  return db.car.findFirst({
    where: carId ? { id: carId, ownerId } : { ownerId },
    orderBy: { updatedAt: "desc" },
    include: {
      buildEntries: {
        orderBy: { occurredAt: "desc" },
        take: 8,
      },
      carParts: {
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

export async function getGarage(carId?: string): Promise<GarageViewModel> {
  try {
    const member = await getCurrentMember();
    const car = await loadCar(member.id, carId);
    return car ? toGarageViewModel(car) : demoGarage;
  } catch {
    // Phase 0 fallback keeps the garage usable before a database is attached.
    return demoGarage;
  }
}

export async function getGarageSwitcher() {
  try {
    const member = await getCurrentMember();
    return await db.car.findMany({
      where: { ownerId: member.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        year: true,
        make: true,
        model: true,
        nickname: true,
      },
    });
  } catch {
    return [];
  }
}

export async function getPrimaryGarage(): Promise<GarageViewModel> {
  return getGarage();
}
