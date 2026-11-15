/**
 * Loads a rich demo dataset into MongoDB so the dashboard looks and behaves like a
 * city that has been running for months:
 *
 *   - ~150 historical incidents over 180 days, each produced by the REAL failure
 *     engine (cascades, impact, severity) so every number is self-consistent
 *   - repair operations and per-incident simulation events (degradations, backup
 *     warnings, restorations, verifications)
 *   - 3 incidents that are still open right now (2 active, 1 recovering) and the
 *     live component statuses they cause
 *   - ~36 saved 3D-simulator runs across all four scenarios
 *
 *   npm run seed:demo             add the dataset (re-running replaces it)
 *   npm run seed:demo -- --clear  remove only what this script added
 *
 * Everything it writes is tagged `seedTag: "demo-dataset"`, so it never touches
 * incidents or simulator runs created by hand. The data is SIMULATED.
 */
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";
import { infrastructureComponents, infrastructureDependencies, districtPopulations } from "@/lib/seed/infrastructure";
import { InfrastructureGraph } from "@/lib/simulation/graph";
import { evaluateNetwork, simulateFailure } from "@/lib/simulation/failureEngine";
import { calculateImpact } from "@/lib/simulation/impactCalculator";
import { projectBackupDepletion } from "@/lib/simulation/backupDepletion";
import { CAUSES, rng } from "@/lib/data/history";
import type { ComponentCategory, InfrastructureComponent } from "@/types/infrastructure";
import type { Incident, IncidentType } from "@/types/incident";
import type { RepairOperation } from "@/types/recovery";
import type { SimulationEvent } from "@/types/simulation";

const TAG = "demo-dataset";
const HISTORY_DAYS = 180;
const HISTORICAL_COUNT = 150;
const MIN = 60_000;

const rand = rng(20261115);
const between = (a: number, b: number) => a + rand() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));
const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
const round1 = (n: number) => Math.round(n * 10) / 10;

const CREWS: Record<ComponentCategory, string[]> = {
  electrical: ["Crew Alpha · Grid Repair", "Crew Bravo · High Voltage", "Hephaestus Linemen"],
  water: ["Poseidon Pipe Crew", "Naiad Hydraulics Team", "Charybdis Pump Techs"],
  comms: ["Hermes Network Team", "Iris Signal Techs"],
  transit: ["Roads & Bridges Unit", "Signal Maintenance Crew"],
  hospital: ["Asclepius Facilities Team", "Biomed Rapid Response"],
  emergency: ["Aegis Systems Crew", "Station Support Detail"],
};

function incidentTypeFor(c: InfrastructureComponent): IncidentType {
  if (rand() < 0.07) return "natural_disaster";
  switch (c.category) {
    case "electrical": return "power_failure";
    case "water": return c.id === "WA-01" || rand() < 0.4 ? "pipeline_rupture" : "water_main_break";
    case "comms": return "communication_outage";
    case "transit": return "transportation_disruption";
    case "hospital": return rand() < 0.6 ? "power_failure" : "communication_outage";
    default: return rand() < 0.5 ? "communication_outage" : "power_failure";
  }
}

const graph = new InfrastructureGraph(infrastructureComponents, infrastructureDependencies);
const byId = new Map(infrastructureComponents.map((c) => [c.id, c]));

// Busier, more critical assets fail more often.
const weights = infrastructureComponents.map((c) => 0.7 + (c.currentLoad / Math.max(c.maxCapacity, 1)) * 0.9 - (c.criticality >= 5 ? 0.25 : 0));
const weightTotal = weights.reduce((a, b) => a + b, 0);
function pickAsset() {
  let r = rand() * weightTotal;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return infrastructureComponents[i]; }
  return infrastructureComponents[0];
}

interface Built { incident: Incident & { seedTag: string }; repairs: (RepairOperation & { seedTag: string })[]; events: (SimulationEvent & { seedTag: string })[] }

/** Runs the real cascade for one failure and turns it into incident + repair + event documents. */
function buildIncident(opts: {
  originId: string;
  start: Date;
  status: Incident["incidentStatus"];
  alreadyFailed?: string[];
  type?: IncidentType;
  durationMinutes?: number;
  repairStage?: RepairOperation["repairStatus"];
  cause?: string;
}): Built {
  const origin = byId.get(opts.originId)!;
  const failedBefore = opts.alreadyFailed ?? [];
  const result = simulateFailure(graph, origin.id, failedBefore);
  const impact = calculateImpact(graph, origin.id, result.states, districtPopulations);
  const backup = projectBackupDepletion(graph, [...failedBefore, origin.id]);
  const id = randomUUID();
  const startMs = opts.start.getTime();
  const resolved = opts.status === "resolved";
  const duration = opts.durationMinutes ?? Math.max(20, Math.round(impact.estimatedRecoveryMinutes * between(0.65, 1.7)));
  const endMs = startMs + duration * MIN;
  const iso = (ms: number) => new Date(ms).toISOString();

  const incident: Incident & { seedTag: string } = {
    incidentId: id,
    componentId: origin.id,
    incidentType: opts.type ?? incidentTypeFor(origin),
    severity: impact.severity,
    startTime: iso(startMs),
    affectedComponents: result.affectedComponents,
    affectedZones: impact.affectedDistricts,
    estimatedImpact: impact,
    incidentStatus: opts.status,
    cause: opts.cause ?? pick(CAUSES[origin.category]),
    ...(resolved ? { durationMinutes: duration, resolvedAt: iso(endMs) } : {}),
    seedTag: TAG,
  };

  const ev = (e: Omit<SimulationEvent, "eventId" | "incidentId">) => ({ eventId: randomUUID(), incidentId: id, ...e, seedTag: TAG });
  const events: Built["events"] = [
    ev({ componentId: origin.id, eventType: "failure_triggered", timestamp: iso(startMs), previousState: "operational", newState: "offline", simulationTimeMinutes: 0, detail: incident.cause }),
    ...result.affectedComponents.map((a) => ev({ componentId: a.componentId, eventType: "component_degraded", timestamp: iso(startMs + Math.max(1, a.distanceFromOrigin) * 5 * MIN), previousState: a.previousStatus, newState: a.newStatus, simulationTimeMinutes: Math.max(1, a.distanceFromOrigin) * 5 })),
    ...backup.transitions.filter((t) => t.simulationTimeMinutes <= duration).map((t) => ev({
      componentId: t.componentId, eventType: t.reason, timestamp: iso(startMs + t.simulationTimeMinutes * MIN), previousState: t.previousStatus, newState: t.newStatus, simulationTimeMinutes: t.simulationTimeMinutes,
      backupRemaining: Math.round(t.backupRemaining * 10) / 10,
      detail: t.reason === "backup_warning" ? "Backup reserve below 25%" : t.reason === "backup_depleted" ? `Backup exhausted; service changed from ${Math.round(t.previousServiceLevel * 100)}% to ${Math.round(t.newServiceLevel * 100)}%` : `Network rebalanced; service changed from ${Math.round(t.previousServiceLevel * 100)}% to ${Math.round(t.newServiceLevel * 100)}%`,
    })),
  ];

  const crew = pick(CREWS[origin.category]);
  const dispatchAt = startMs + int(6, 18) * MIN;
  const repairs: Built["repairs"] = [];
  if (resolved) {
    events.push(ev({ componentId: origin.id, eventType: "repair_started", timestamp: iso(dispatchAt), previousState: "offline", newState: "offline", simulationTimeMinutes: Math.round((dispatchAt - startMs) / MIN), detail: crew }));
    // Downstream assets come back in waves once the origin is restored.
    result.affectedComponents.forEach((a) => events.push(ev({ componentId: a.componentId, eventType: "component_restored", timestamp: iso(endMs + Math.max(1, a.distanceFromOrigin) * 3 * MIN), previousState: a.newStatus, newState: "operational", simulationTimeMinutes: duration + Math.max(1, a.distanceFromOrigin) * 3 })));
    events.push(ev({ componentId: origin.id, eventType: "repair_verified", timestamp: iso(endMs), previousState: "offline", newState: "operational", simulationTimeMinutes: duration }));
    repairs.push({ repairId: randomUUID(), incidentId: id, componentId: origin.id, assignedCrew: crew, repairStatus: "restored", estimatedCompletion: iso(startMs + impact.estimatedRecoveryMinutes * MIN), actualCompletion: iso(endMs), verificationStatus: "verified", seedTag: TAG });
  } else {
    const stage = opts.repairStage ?? "crew_dispatched";
    events.push(ev({ componentId: origin.id, eventType: "repair_started", timestamp: iso(dispatchAt), previousState: "offline", newState: "offline", simulationTimeMinutes: Math.round((dispatchAt - startMs) / MIN), detail: crew }));
    repairs.push({ repairId: randomUUID(), incidentId: id, componentId: origin.id, assignedCrew: crew, repairStatus: stage, estimatedCompletion: iso(startMs + impact.estimatedRecoveryMinutes * MIN), verificationStatus: "pending", seedTag: TAG });
  }
  events.sort((a, b) => a.simulationTimeMinutes - b.simulationTimeMinutes);
  return { incident, repairs, events };
}

// ---------------------------------------------------------------- history
function historicalIncidents(): Built[] {
  const out: Built[] = [];
  const now = Date.now();
  // A few landmark events so the timeline has memorable moments.
  const landmarks: { originId: string; daysAgo: number; type: IncidentType; cause: string }[] = [
    { originId: "EL-01", daysAgo: 127, type: "natural_disaster", cause: "Storm of Zeus — lightning strike on switchyard" },
    { originId: "CO-01", daysAgo: 88, type: "communication_outage", cause: "Fibre cut during harbour dredging" },
    { originId: "EL-03", daysAgo: 53, type: "power_failure", cause: "Transformer overload in heatwave" },
    { originId: "WA-01", daysAgo: 31, type: "pipeline_rupture", cause: "Main pipe rupture under Odysseus Bridge" },
    { originId: "EL-02", daysAgo: 11, type: "power_failure", cause: "Breaker trip cascade" },
  ];
  landmarks.forEach((l) => {
    out.push(buildIncident({ originId: l.originId, start: new Date(now - l.daysAgo * 86_400_000 - int(0, 20) * 3_600_000), status: "resolved", type: l.type, cause: l.cause }));
  });
  while (out.length < HISTORICAL_COUNT) {
    const asset = pickAsset();
    const daysAgo = int(2, HISTORY_DAYS);
    // Failures cluster in the evening demand peak and the early-morning cold start.
    const r = rand();
    const hour = r < 0.38 ? int(17, 21) : r < 0.55 ? int(5, 7) : int(0, 23);
    const start = new Date(now - daysAgo * 86_400_000);
    start.setHours(hour, int(0, 59), int(0, 59), 0);
    out.push(buildIncident({ originId: asset.id, start, status: "resolved" }));
  }
  return out.sort((a, b) => a.incident.startTime.localeCompare(b.incident.startTime));
}

// ---------------------------------------------------------------- live crisis
function liveIncidents(): Built[] {
  const now = Date.now();
  const failed: string[] = [];
  const specs: { originId: string; minutesAgo: number; status: Incident["incidentStatus"]; type: IncidentType; cause: string; stage?: RepairOperation["repairStatus"] }[] = [
    { originId: "EL-05", minutesAgo: 140, status: "recovering", type: "power_failure", cause: "Breaker trip cascade at Sanctuary Substation", stage: "repair_in_progress" },
    { originId: "WA-01", minutesAgo: 61, status: "active", type: "pipeline_rupture", cause: "Main pipe rupture at Poseidon Waterworks", stage: "crew_dispatched" },
    { originId: "CO-03", minutesAgo: 24, status: "active", type: "communication_outage", cause: "Radio interference at Pharos Lighthouse Relay", stage: "inspection_in_progress" },
  ];
  return specs.map((s) => {
    const built = buildIncident({ originId: s.originId, start: new Date(now - s.minutesAgo * MIN), status: s.status, alreadyFailed: [...failed], type: s.type, cause: s.cause, repairStage: s.stage });
    failed.push(s.originId);
    return built;
  });
}

// ---------------------------------------------------------------- simulator runs
interface Scn {
  key: string; title: string; end: number;
  o1: [string, string][]; o2: [string, string][];
  kpiLabels: string[];
  kpis: (d: number) => (string | number)[];
  good: (t: number, k: (string | number)[], o1: string) => string;
  bad: (k: (string | number)[], end: number) => string;
  events: (o1: string, o2: string, good: boolean, end: number) => { t: number; text: string; kind: string }[];
  minGood: number;
}

const SCENARIOS: Scn[] = [
  {
    key: "fire", title: "Fire in the Palace", end: 60, minGood: 14,
    o1: [["0", "Odysseus"], ["1", "Laertes"], ["2", "Eupeithes"], ["3", "Polybus"], ["4", "Mentor"]],
    o2: [["calm", "Still air"], ["boreas", "Boreas — north wind"], ["notus", "Notus — south wind"], ["zephyrus", "Zephyrus — west wind"], ["eurus", "Eurus — east wind"]],
    kpiLabels: ["Houses ablaze", "Houses lost", "Homeless", "Injured", "Brigade", "Severity"],
    kpis: (d) => [Math.round(d * 40), Math.round(8 + d * 70), Math.round(30 + d * 330), Math.round(2 + d * 26), int(6, 14), 0],
    good: (t, k) => `Fire contained at t+${t}m. ${k[1]} houses lost, ${k[3]} injured.`,
    bad: (k, end) => `After ${end} minutes ${k[0]} houses still burn; ${k[2]} people are homeless.`,
    events: (o1, o2, good, end) => [
      { t: 0, text: `A blaze starts in the Palace of ${o1}.`, kind: "bad" },
      { t: 4, text: `${o2} drives embers toward neighbouring roofs.`, kind: "warn" },
      { t: 9, text: "The Hephaestus Fire Brigade rolls out from the Citadel.", kind: "info" },
      { t: 16, text: "A firebreak is cut across the lower terraces.", kind: "good" },
      { t: Math.round(end * 0.5), text: good ? "The wind drops and the flames begin to fall back." : "Sparks jump the firebreak; a second quarter ignites.", kind: good ? "good" : "bad" },
      { t: end, text: good ? "The last embers are put out." : "Crews are overwhelmed as the hour ends.", kind: good ? "good" : "bad" },
    ],
  },
  {
    key: "rain", title: "The Great Rains", end: 36, minGood: 20,
    o1: [["autumn", "Autumn storms"], ["winter", "Winter rains"]],
    o2: [["steady", "Steady rain"], ["storm", "Storm of Zeus"], ["deluge", "The great deluge"]],
    kpiLabels: ["Sea level", "Houses flooded", "Collapsed", "Homeless", "Grain spoiled", "Severity"],
    kpis: (d) => [`+${round1(0.4 + d * 2.6)}m`, Math.round(10 + d * 120), Math.round(d * 28), Math.round(20 + d * 260), `${Math.round(5 + d * 60)}%`, 0],
    good: (t, k) => `The rains pass at h+${t}. ${k[1]} houses flooded, ${k[2]} collapsed.`,
    bad: (k, end) => `After ${end} hours the water still rises: ${k[1]} houses flooded and ${k[4]} of the grain lost.`,
    events: (o1, o2, good, end) => [
      { t: 0, text: `${o1} set in over Ithaca (${o2}).`, kind: "info" },
      { t: 6, text: "The lower harbour road floods.", kind: "warn" },
      { t: 12, text: "The cisterns overflow; grain stores are threatened.", kind: "warn" },
      { t: Math.round(end * 0.55), text: good ? "The sky clears over Mount Neritos." : "A hillside gives way above Acropolis Heights.", kind: good ? "good" : "bad" },
      { t: end, text: good ? "The waters begin to recede." : "The flood is still rising at the end of the watch.", kind: good ? "good" : "bad" },
    ],
  },
  {
    key: "attack", title: "Raiders from the Sea", end: 90, minGood: 30,
    o1: [["asleep", "Caught asleep"], ["watchful", "Watchful"], ["ready", "Battle-ready"]],
    o2: [["party", "Raiding party · 6 ships"], ["fleet", "Taphian fleet · 12 ships"], ["invasion", "Great invasion · 20 ships"]],
    kpiLabels: ["Raiders", "Defenders", "Houses burned", "Plundered", "Wounded", "Severity"],
    kpis: (d) => [Math.round(180 - d * 140), int(60, 140), Math.round(d * 55), `${Math.round(5 + d * 60)}%`, Math.round(6 + d * 70), 0],
    good: (t, k) => `The raiders are driven off at t+${t}m. ${k[2]} houses burned, ${k[4]} wounded.`,
    bad: (k, end) => `After ${end} minutes the raiders still hold the harbour; ${k[3]} of stores plundered.`,
    events: (o1, o2, good, end) => [
      { t: 0, text: `Sails appear on the horizon — ${o2}. Ithaca is ${o1.toLowerCase()}.`, kind: "bad" },
      { t: 10, text: "The beacon at Pharos Lighthouse is lit.", kind: "info" },
      { t: 22, text: "Defenders muster at the harbour wall.", kind: "info" },
      { t: Math.round(end * 0.5), text: good ? "The line holds; raiders retreat to their ships." : "The harbour gate is breached.", kind: good ? "good" : "bad" },
      { t: end, text: good ? "The last ship slips over the horizon." : "Warehouses burn along the quay.", kind: good ? "good" : "bad" },
    ],
  },
  {
    key: "quake", title: "Poseidon the Earth-Shaker", end: 60, minGood: 40,
    o1: [["city", "Beneath the city"], ["neritos", "Under Mount Neritos"], ["sea", "Under the sea (tsunami)"]],
    o2: [["moderate", "Moderate · 6.0"], ["strong", "Strong · 6.8"], ["great", "Great · 7.3 (as in 1953)"]],
    kpiLabels: ["Collapsed", "Damaged", "Trapped", "Homeless", "Injured", "Severity"],
    kpis: (d) => [Math.round(6 + d * 90), Math.round(30 + d * 220), Math.round(d * 90), Math.round(60 + d * 800), Math.round(10 + d * 110), 0],
    good: (t, k) => `The shaking is over. ${k[0]} houses collapsed, ${k[1]} cracked, everyone pulled alive from the rubble.`,
    bad: (k) => `An hour after the quake, ${k[2]} people are still buried.`,
    events: (o1, o2, good, end) => [
      { t: 0, text: `The earth shakes — ${o2.toLowerCase()}, ${o1.toLowerCase()}.`, kind: "bad" },
      { t: 3, text: "Two-storey houses on the slopes collapse.", kind: "bad" },
      { t: 10, text: "Neighbours pull the first survivors from the rubble.", kind: "good" },
      { t: 20, text: "Aftershock: a second row of houses falls.", kind: "warn" },
      { t: Math.round(end * 0.75), text: good ? "Rescue crews reach the last buried household." : "Fires break out in the ruins.", kind: good ? "good" : "bad" },
      { t: end, text: good ? "The city begins to count its losses." : "Crews are still digging.", kind: good ? "good" : "bad" },
    ],
  },
];

function simulatorRuns() {
  const runs: Record<string, unknown>[] = [];
  const now = Date.now();
  SCENARIOS.forEach((sc) => {
    for (let i = 0; i < 9; i++) {
      const [o1v, o1l] = pick(sc.o1);
      const [o2v, o2l] = pick(sc.o2);
      const d = Math.min(1, Math.max(0.05, (sc.o1.findIndex((o) => o[0] === o1v) / Math.max(sc.o1.length - 1, 1)) * (sc.key === "attack" ? -0.4 : 0.35) + (sc.o2.findIndex((o) => o[0] === o2v) / Math.max(sc.o2.length - 1, 1)) * 0.5 + between(0.05, 0.4) + (sc.key === "attack" ? 0.3 : 0)));
      const good = rand() > d * 0.85;
      const t = good ? int(sc.minGood, Math.round(sc.end * 0.9)) : sc.end;
      const k = sc.kpis(d);
      const peak = Math.round(20 + d * 62 + between(0, 10));
      const finalSev = good ? Math.round(between(2, 16)) : Math.round(peak * between(0.6, 0.95));
      k[k.length - 1] = finalSev;
      const peakAt = Math.round(t * between(0.3, 0.55));
      const step = Math.max(1, Math.round(t / 40));
      const curve: { t: number; sev: number }[] = [];
      for (let x = 0; x <= t; x += step) {
        const sev = x <= peakAt ? peak * (x / Math.max(peakAt, 1)) ** 0.8 : good ? finalSev + (peak - finalSev) * Math.exp(-(x - peakAt) / Math.max(t * 0.22, 1)) : peak - (peak - finalSev) * ((x - peakAt) / Math.max(t - peakAt, 1)) * 0.6;
        curve.push({ t: x, sev: Math.max(0, Math.min(100, Math.round(sev + between(-2, 2)))) });
      }
      const endedAt = new Date(now - int(1, 90) * 86_400_000 - int(0, 23) * 3_600_000);
      const wall = Math.round(sc.end * 0.8) * MIN;
      runs.push({
        runId: randomUUID(),
        scenario: sc.key,
        scenarioTitle: sc.title,
        options: { o1: o1v, o1Label: o1l, o2: o2v, o2Label: o2l },
        outcome: good ? "good" : "bad",
        outcomeText: good ? sc.good(t, k, o1l) : sc.bad(k, sc.end),
        durationSimMinutes: t,
        severity: finalSev,
        maxSeverity: Math.max(peak, ...curve.map((c) => c.sev)),
        kpis: sc.kpiLabels.map((label, idx) => ({ label, value: k[idx] })),
        curve,
        events: sc.events(o1l, o2l, good, t).filter((e) => e.t <= t),
        startedAt: new Date(endedAt.getTime() - wall).toISOString(),
        endedAt: endedAt.toISOString(),
        source: "3d-simulator",
        seedTag: TAG,
      });
    }
  });
  return runs.sort((a, b) => String(b.endedAt).localeCompare(String(a.endedAt)));
}

// ---------------------------------------------------------------- main
async function clear(db: Awaited<ReturnType<typeof getDb>>) {
  const filter = { seedTag: TAG };
  for (const name of [collections.incidents, collections.repairOperations, collections.simulationEvents, collections.simulatorHistory]) {
    const { deletedCount } = await db.collection(name).deleteMany(filter);
    console.log(`${name}: removed ${deletedCount} seeded documents`);
  }
}

/** Recomputes every component's status from the incidents that are still open. */
async function applyLiveStatuses(db: Awaited<ReturnType<typeof getDb>>) {
  const open = await db.collection<Incident>(collections.incidents).find({ incidentStatus: { $ne: "resolved" } }, { projection: { componentId: 1 } }).toArray();
  const states = evaluateNetwork(graph, new Set(open.map((i) => i.componentId)));
  await db.collection(collections.infrastructureComponents).bulkWrite(
    Array.from(states, ([id, s]) => ({ updateOne: { filter: { id }, update: { $set: { status: s.status } } } }))
  );
  const tally: Record<string, number> = {};
  states.forEach((s) => { tally[s.status] = (tally[s.status] ?? 0) + 1; });
  console.log("component statuses now:", tally);
}

async function insertBatches(db: Awaited<ReturnType<typeof getDb>>, name: string, docs: object[]) {
  for (let i = 0; i < docs.length; i += 500) await db.collection(name).insertMany(docs.slice(i, i + 500).map((d) => ({ ...d })));
}

async function main() {
  const db = await getDb();
  // Make sure the components/dependencies exist before layering history on top.
  const have = await db.collection(collections.infrastructureComponents).countDocuments();
  if (have < infrastructureComponents.length) throw new Error("Infrastructure is not seeded. Run `npm run seed` first.");

  await clear(db);
  if (process.argv.includes("--clear")) {
    await applyLiveStatuses(db);
    process.exit(0);
  }

  const built = [...historicalIncidents(), ...liveIncidents()];
  const incidents = built.map((b) => b.incident);
  const repairs = built.flatMap((b) => b.repairs);
  const events = built.flatMap((b) => b.events);
  const runs = simulatorRuns();

  await insertBatches(db, collections.incidents, incidents);
  await insertBatches(db, collections.repairOperations, repairs);
  await insertBatches(db, collections.simulationEvents, events);
  await insertBatches(db, collections.simulatorHistory, runs);
  await applyLiveStatuses(db);

  const sev: Record<string, number> = {};
  incidents.forEach((i) => { sev[i.severity] = (sev[i.severity] ?? 0) + 1; });
  console.log(`\nincidents: ${incidents.length} (${incidents.filter((i) => i.incidentStatus !== "resolved").length} open)`, sev);
  console.log(`repair operations: ${repairs.length}`);
  console.log(`simulation events: ${events.length}`);
  console.log(`simulator runs: ${runs.length}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
