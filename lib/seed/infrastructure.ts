import type {
  ComponentCategory,
  Criticality,
  DependencyType,
  District,
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";

/**
 * Seed data for the simulated city of Ithaca: 38 components, 69 dependencies,
 * 4 districts. Everything here is invented for the demo. Coordinates are
 * scene units for the 3D map, capacities are abstract "capacity units", and
 * none of it describes real infrastructure.
 *
 * Load it with `npm run seed`. The numbers are tuned so the cascade engine
 * (lib/simulation/failureEngine.ts) produces different outcomes per scenario:
 * change them and re-run `npm run verify:graph` to see what moved.
 */

const ACROPOLIS = "Acropolis Heights";
const HARBOR = "Harbor of Phorcys";
const AGORA = "Agora Central";
const SANCTUARY = "Athena Sanctuary";

export const districts: District[] = [
  {
    name: ACROPOLIS,
    population: 21000,
    character: "The western high ground: the Power Citadel, the main hospital and hillside homes.",
    center: { x: -170, y: 0, z: -90 },
  },
  {
    name: HARBOR,
    population: 16500,
    character: "The working waterfront: generation, the waterworks, the port and the bridge.",
    center: { x: -60, y: 0, z: 220 },
  },
  {
    name: AGORA,
    population: 34000,
    character: "The dense civic core: markets, transit, the central exchange and command center.",
    center: { x: 50, y: 0, z: -10 },
  },
  {
    name: SANCTUARY,
    population: 12500,
    character: "The quiet eastern shore: temples, a small clinic and its own renewable supply.",
    center: { x: 215, y: 0, z: -110 },
  },
];

export const districtPopulations: Record<string, number> = Object.fromEntries(
  districts.map((d) => [d.name, d.population])
);

type ComponentRow = [
  id: string,
  name: string,
  category: ComponentCategory,
  district: string,
  x: number,
  z: number,
  maxCapacity: number,
  /** Own load for end consumers; suppliers get theirs from the edges they feed. */
  ownLoad: number,
  backupCapacityRemaining: number,
  criticality: Criticality,
];

const componentRows: ComponentRow[] = [
  // Electrical
  ["EL-01", "Helios Generating Station", "electrical", HARBOR, -240, 200, 900, 0, 0, 5],
  ["EL-02", "Power Citadel Substation", "electrical", ACROPOLIS, -270, 35, 280, 0, 0, 5],
  ["EL-03", "Agora Grid Substation", "electrical", AGORA, 60, -60, 340, 0, 0, 5],
  ["EL-04", "Phorcys Harbor Substation", "electrical", HARBOR, -30, 190, 220, 0, 0, 4],
  ["EL-05", "Sanctuary Substation", "electrical", SANCTUARY, 215, -150, 160, 0, 0, 4],
  ["EL-06", "Aeolus Wind Farm", "electrical", ACROPOLIS, -200, -220, 200, 0, 0, 3],
  ["EL-07", "Olive Grove Solar Array", "electrical", SANCTUARY, 220, 40, 60, 0, 0, 2],
  ["EL-08", "Citadel Battery Reserve", "electrical", ACROPOLIS, -225, -25, 100, 0, 100, 3],

  // Water
  ["WA-01", "Poseidon Waterworks", "water", HARBOR, -100, 255, 340, 0, 0, 5],
  ["WA-02", "Arethusa Spring Pump Station", "water", ACROPOLIS, -150, -80, 120, 0, 0, 4],
  ["WA-03", "Cistern of the Nymphs", "water", ACROPOLIS, -120, -180, 200, 0, 60, 3],
  ["WA-04", "Agora Booster Pump", "water", AGORA, -10, 30, 140, 0, 0, 4],
  ["WA-05", "Agora Water Tower", "water", AGORA, 110, 20, 160, 0, 110, 3],
  ["WA-06", "Sanctuary Pump Station", "water", SANCTUARY, 190, -40, 90, 0, 40, 3],
  ["WA-07", "Charybdis Reclamation Works", "water", HARBOR, 60, 250, 180, 120, 0, 3],

  // Hospitals
  ["HO-01", "Asclepius General Hospital", "hospital", ACROPOLIS, -170, 20, 420, 310, 90, 5],
  ["HO-02", "Agora Medical Center", "hospital", AGORA, 90, -20, 260, 190, 40, 5],
  ["HO-03", "Machaon Harbor Clinic", "hospital", HARBOR, -150, 170, 80, 45, 10, 3],
  ["HO-04", "Hygieia Healing House", "hospital", SANCTUARY, 240, -40, 60, 30, 15, 3],

  // Emergency services
  ["EM-01", "Aegis Emergency Operations Center", "emergency", AGORA, 30, -100, 100, 60, 50, 5],
  ["EM-02", "Hephaestus Fire Brigade", "emergency", ACROPOLIS, -90, -40, 40, 22, 20, 4],
  ["EM-03", "Triton Harbor Fire and Rescue", "emergency", HARBOR, -200, 255, 40, 20, 16, 4],
  ["EM-04", "Argus Watch Police Precinct", "emergency", AGORA, 130, 80, 60, 40, 8, 4],
  ["EM-05", "Paean Ambulance Depot", "emergency", AGORA, -30, -30, 30, 18, 14, 4],
  ["EM-06", "Sanctuary Fire Post", "emergency", SANCTUARY, 200, -220, 25, 10, 8, 3],
  ["EM-07", "Ino's Watch Coast Guard", "emergency", HARBOR, 110, 200, 30, 14, 10, 3],

  // Communications
  ["CO-01", "Hermes Central Exchange", "comms", AGORA, 80, -110, 200, 0, 40, 5],
  ["CO-02", "Iris Signal Tower", "comms", ACROPOLIS, -60, -230, 80, 0, 6, 3],
  ["CO-03", "Pharos Lighthouse Relay", "comms", HARBOR, 0, 270, 80, 0, 15, 3],
  ["CO-04", "Oracle Relay", "comms", SANCTUARY, 225, -235, 60, 20, 12, 3],
  ["CO-05", "Mnemosyne Data Vault", "comms", AGORA, 140, -90, 150, 95, 60, 4],

  // Transit
  ["TR-01", "Agora Signal Grid", "transit", AGORA, -20, 90, 120, 0, 5, 4],
  ["TR-02", "Acropolis Signal Grid", "transit", ACROPOLIS, -200, -100, 80, 0, 3, 3],
  ["TR-03", "Harbor Signal Grid", "transit", HARBOR, -60, 150, 80, 0, 3, 3],
  ["TR-04", "Hermes Transit Hub", "transit", AGORA, 40, 60, 300, 210, 25, 4],
  ["TR-05", "Odysseus Bridge", "transit", HARBOR, 40, 130, 150, 90, 10, 4],
  ["TR-06", "Via Asclepia Emergency Corridor", "transit", ACROPOLIS, -110, 30, 60, 25, 0, 5],
  ["TR-07", "Port of Phorcys Ferry Terminal", "transit", HARBOR, 150, 270, 200, 110, 0, 3],
];

type DependencyRow = [
  sourceId: string,
  targetId: string,
  requiredCapacity: number,
  hasBackup?: boolean,
];

const BACKUP = true;

const dependencyRows: Record<DependencyType, DependencyRow[]> = {
  power_supply: [
    // Generation into the four substations. Wind and solar are weaker alternates.
    ["EL-01", "EL-02", 270],
    ["EL-01", "EL-03", 310],
    ["EL-01", "EL-04", 200],
    ["EL-01", "EL-05", 70],
    ["EL-06", "EL-02", 150],
    ["EL-06", "EL-05", 40],
    ["EL-07", "EL-05", 30],
    ["EL-02", "EL-08", 50, BACKUP],
    // Pumps and plants
    ["EL-02", "WA-01", 60],
    ["EL-04", "WA-01", 45],
    ["EL-02", "WA-02", 40],
    ["EL-03", "WA-04", 35],
    ["EL-05", "WA-06", 25],
    ["EL-04", "WA-07", 45],
    // Hospitals: all have generators, not all generators are big enough
    ["EL-02", "HO-01", 70, BACKUP],
    ["EL-08", "HO-01", 35],
    ["EL-03", "HO-02", 50, BACKUP],
    ["EL-04", "HO-03", 20, BACKUP],
    ["EL-05", "HO-04", 15, BACKUP],
    // Emergency services
    ["EL-03", "EM-01", 30, BACKUP],
    ["EL-02", "EM-02", 12, BACKUP],
    ["EL-04", "EM-03", 12, BACKUP],
    ["EL-03", "EM-04", 15, BACKUP],
    ["EL-03", "EM-05", 8, BACKUP],
    ["EL-05", "EM-06", 8, BACKUP],
    ["EL-04", "EM-07", 10, BACKUP],
    // Communications
    ["EL-03", "CO-01", 40, BACKUP],
    ["EL-02", "CO-02", 15, BACKUP],
    ["EL-04", "CO-03", 15, BACKUP],
    ["EL-05", "CO-04", 12, BACKUP],
    ["EL-03", "CO-05", 60, BACKUP],
    // Transit: signal grids have no backup power and go dark
    ["EL-03", "TR-01", 25],
    ["EL-02", "TR-02", 18],
    ["EL-04", "TR-03", 15],
    ["EL-03", "TR-04", 45, BACKUP],
    ["EL-04", "TR-05", 10, BACKUP],
    ["EL-04", "TR-07", 20],
  ],
  water_supply: [
    ["WA-01", "WA-02", 80],
    ["WA-01", "WA-04", 100],
    ["WA-01", "WA-06", 60, BACKUP],
    ["WA-01", "HO-01", 40, BACKUP],
    ["WA-01", "HO-03", 10],
    ["WA-01", "EM-03", 20, BACKUP],
    ["WA-02", "WA-03", 90, BACKUP],
    ["WA-03", "EM-02", 20],
    ["WA-04", "WA-05", 110, BACKUP],
    ["WA-05", "HO-02", 25],
    ["WA-05", "CO-05", 15],
    ["WA-06", "HO-04", 8],
    ["WA-06", "EM-06", 12],
  ],
  data_link: [
    ["CO-01", "CO-02", 30],
    ["CO-01", "CO-03", 30],
    ["CO-01", "CO-04", 25],
    ["CO-01", "CO-05", 40],
    ["CO-01", "EM-01", 20, BACKUP],
    ["CO-01", "EM-04", 8, BACKUP],
    ["CO-01", "EM-05", 4, BACKUP],
    ["CO-02", "EM-02", 5, BACKUP],
    ["CO-03", "EM-03", 5, BACKUP],
    ["CO-03", "EM-07", 5, BACKUP],
    ["CO-03", "TR-07", 8],
  ],
  control_signal: [
    ["CO-01", "TR-01", 10, BACKUP],
    ["CO-02", "TR-02", 6, BACKUP],
    ["CO-03", "TR-03", 6, BACKUP],
    ["TR-01", "TR-04", 30],
    ["TR-03", "TR-05", 20],
    ["TR-02", "TR-06", 15],
  ],
  road_access: [
    ["TR-01", "TR-06", 15],
    ["TR-01", "EM-05", 10, BACKUP],
  ],
};

export const infrastructureDependencies: InfrastructureDependency[] = (
  Object.entries(dependencyRows) as [DependencyType, DependencyRow[]][]
)
  .flatMap(([dependencyType, rows]) =>
    rows.map(([sourceId, targetId, requiredCapacity, hasBackup = false]) => ({
      sourceId,
      targetId,
      dependencyType,
      requiredCapacity,
      hasBackup,
    }))
  )
  .map((dependency, index) => ({
    id: `DEP-${String(index + 1).padStart(3, "0")}`,
    ...dependency,
  }));

export const infrastructureComponents: InfrastructureComponent[] = componentRows.map(
  ([id, name, category, district, x, z, maxCapacity, ownLoad, backupCapacityRemaining, criticality]) => {
    const supplied = infrastructureDependencies
      .filter((d) => d.sourceId === id)
      .reduce((sum, d) => sum + d.requiredCapacity, 0);
    return {
      id,
      name,
      category,
      district,
      coordinates: { x, y: 0, z },
      maxCapacity,
      currentLoad: supplied > 0 ? supplied : ownLoad,
      backupCapacityRemaining,
      status: "operational",
      criticality,
    };
  }
);

export interface DemoScenario {
  id: string;
  title: string;
  chapter: string;
  originId: string;
  story: string;
}

/** Ready-made trials for the demo. Expected outcomes are printed by `npm run verify:graph`. */
export const demoScenarios: DemoScenario[] = [
  {
    id: "citadel-falls",
    title: "The Citadel Falls",
    chapter: "II. Poseidon's Wrath",
    originId: "EL-02",
    story:
      "The Power Citadel trips. Acropolis signals go dark and the emergency corridor to Asclepius General closes while the hospital rides on battery and generator.",
  },
  {
    id: "helios-goes-dark",
    title: "Helios Goes Dark",
    chapter: "III. The Labyrinth",
    originId: "EL-01",
    story:
      "The generating station is lost. Three substations starve, but wind keeps the Citadel half alive and the Sanctuary carries on under its own wind and sun.",
  },
  {
    id: "scylla-at-the-waterworks",
    title: "Scylla at the Waterworks",
    chapter: "III. The Labyrinth",
    originId: "WA-01",
    story:
      "Poseidon Waterworks stops. Pumps run dry, towers and cisterns drain, and each hospital survives or not on the size of its own tank.",
  },
  {
    id: "silence-of-hermes",
    title: "The Silence of Hermes",
    chapter: "IV. Athena's Strategy",
    originId: "CO-01",
    story:
      "The central exchange fails with the power still on. Nothing is dark, yet relays, signal timing and dispatch all degrade: a failure the map alone would hide.",
  },
];
