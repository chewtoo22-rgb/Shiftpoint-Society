export type GarageMod = {
  type: string;
  name: string;
  delta: string;
};

export type BuildLogItem = {
  date: string;
  title: string;
  detail: string;
};

export type GarageViewModel = {
  id: string;
  eyebrow: string;
  year: number;
  make: string;
  model: string;
  engine: string;
  drivetrain: string;
  power: string;
  quarterMile: string;
  status: string;
  wrenchScore: number;
  partsLogged: number;
  partsInstalled: number;
  buildAge: string;
  lastUpdated: string;
  mods: GarageMod[];
  timeline: BuildLogItem[];
};

// Presentation fixture only. Next step is mapping Prisma Car + BuildEntry records
// into this stable view model without coupling UI components to persistence.
export const demoGarage: GarageViewModel = {
  id: "build-001",
  eyebrow: "MY GARAGE // BUILD 001",
  year: 2000,
  make: "FORD",
  model: "CONTOUR SVT",
  engine: "2.5L DURATEC V6",
  drivetrain: "FWD / 5MT",
  power: "284 HP",
  quarterMile: "13.94 @ 101",
  status: "ACTIVE",
  wrenchScore: 87,
  partsLogged: 24,
  partsInstalled: 19,
  buildAge: "04Y",
  lastUpdated: "Last updated 3 days ago",
  mods: [
    { type: "INTAKE", name: "Cold-air system", delta: "+8 hp" },
    { type: "EXHAUST", name: "3-inch cat-back", delta: "+14 hp" },
    { type: "SUSPENSION", name: "Coilover setup", delta: "-1.4 in" },
    { type: "TUNE", name: "93 octane street map", delta: "+31 hp" },
  ],
  timeline: [
    { date: "AUG 18", title: "Baseline dyno", detail: "231 WHP / 218 WTQ" },
    { date: "AUG 09", title: "Suspension reset", detail: "Ride height, damping and alignment dialed in" },
    { date: "JUL 27", title: "Exhaust installed", detail: "Full 3-inch system with resonator" },
  ],
};
