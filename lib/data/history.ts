import type { ComponentCategory, InfrastructureComponent } from "@/types/infrastructure";
import type { Incident } from "@/types/incident";

/**
 * A deterministic, SIMULATED 180-day operations record for the city of Ithaca.
 * It gives the advisors (Gemini) real statistical evidence — failure causes,
 * repair times, repeat offenders, seasonal and hourly patterns — instead of a
 * single snapshot. Same city in → same record out, so results are stable.
 */

export const HISTORY_DAYS = 180;

type Sev = "minor" | "moderate" | "major" | "critical";

export interface PastIncident {
  id: string;
  daysAgo: number;
  hour: number;
  assetId: string;
  assetName: string;
  category: ComponentCategory;
  district: string;
  cause: string;
  severity: Sev;
  durationMin: number;
  downstreamAssets: number;
  populationAffectedPct: number;
}

export const CAUSES: Record<ComponentCategory, string[]> = {
  electrical: ["Transformer overload", "Lightning strike", "Grid frequency fault", "Cable insulation failure", "Breaker trip cascade"],
  water: ["Main pipe rupture", "Pump bearing failure", "Pressure surge", "Contamination alarm", "Reservoir valve fault"],
  transit: ["Signal controller fault", "Bridge structural closure", "Road flooding", "Collision blockage", "Control-room power dip"],
  comms: ["Fibre cut", "Exchange overheating", "Radio interference", "Switch firmware crash", "Backhaul congestion"],
  hospital: ["Backup generator fault", "Oxygen supply interruption", "Cooling plant failure", "Dispatch link loss"],
  emergency: ["Dispatch console outage", "Station power loss", "Radio relay failure", "Vehicle depot flooding"],
};
// Repair difficulty per category (median minutes) — mirrors how real systems differ.
export const BASE_MTTR: Record<ComponentCategory, number> = { electrical: 190, water: 260, transit: 120, comms: 95, hospital: 150, emergency: 80 };
// Months (0-11) where a category is more fragile: summer grid load, winter storms, etc.
const SEASON: Partial<Record<ComponentCategory, number[]>> = { electrical: [5, 6, 7, 8], water: [0, 1, 11], transit: [0, 1, 2, 10, 11] };

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEV_ORDER: Sev[] = ["minor", "moderate", "major", "critical"];

export function buildHistory(components: InfrastructureComponent[]): PastIncident[] {
  if (!components.length) return [];
  const rand = rng(20261114 + components.length * 7919);
  const today = new Date();
  const log: PastIncident[] = [];
  // Fragility weight: busier, older-feeling assets (high load ratio) fail more often.
  const weights = components.map((c) => 0.35 + (c.currentLoad / Math.max(c.maxCapacity, 1)) * 1.6 + (6 - c.criticality) * 0.08);
  const total = weights.reduce((a, b) => a + b, 0);
  const pick = () => {
    let r = rand() * total;
    for (let i = 0; i < components.length; i++) { r -= weights[i]; if (r <= 0) return components[i]; }
    return components[components.length - 1];
  };

  for (let d = HISTORY_DAYS; d >= 1; d--) {
    const date = new Date(today.getTime() - d * 86_400_000);
    const month = date.getMonth();
    // ~0.55 incidents/day on average, with bursty storm-like days.
    const burst = rand() < 0.06 ? 3 : 1;
    let n = 0;
    const roll = rand();
    n = roll < 0.5 ? 0 : roll < 0.85 ? 1 : 2;
    n *= burst;
    for (let k = 0; k < n; k++) {
      let asset = pick();
      // Seasonal bias: re-roll once toward fragile categories for the month.
      if (!(SEASON[asset.category]?.includes(month)) && rand() < 0.35) asset = pick();
      const seasonal = SEASON[asset.category]?.includes(month) ? 1.25 : 1;
      const sevRoll = rand() * (asset.criticality >= 4 ? 0.92 : 1);
      const severity: Sev = sevRoll < 0.5 ? "minor" : sevRoll < 0.8 ? "moderate" : sevRoll < 0.95 ? "major" : "critical";
      const sevMult = [0.45, 1, 2.1, 3.6][SEV_ORDER.indexOf(severity)];
      const durationMin = Math.max(8, Math.round(BASE_MTTR[asset.category] * sevMult * seasonal * (0.6 + rand() * 0.9)));
      // Failures cluster in the evening demand peak and early-morning cold starts.
      const hourRoll = rand();
      const hour = hourRoll < 0.38 ? 17 + Math.floor(rand() * 5) : hourRoll < 0.55 ? 5 + Math.floor(rand() * 3) : Math.floor(rand() * 24);
      const causes = CAUSES[asset.category];
      log.push({
        id: `H-${String(log.length + 1).padStart(3, "0")}`,
        daysAgo: d,
        hour,
        assetId: asset.id,
        assetName: asset.name,
        category: asset.category,
        district: asset.district,
        cause: causes[Math.floor(rand() * causes.length)],
        severity,
        durationMin,
        downstreamAssets: Math.round(sevMult * (1 + rand() * 4) * (asset.criticality / 3)),
        populationAffectedPct: Math.min(70, Math.round(sevMult * (1 + rand() * 5) * (asset.criticality / 3) * 10) / 10),
      });
    }
  }
  return log;
}

export interface HistorySummary {
  windowDays: number;
  note: string;
  totalIncidents: number;
  last30: number;
  previous30: number;
  trendPct: number;
  totalDowntimeHours: number;
  severityMix: Record<Sev, number>;
  byCategory: { category: string; incidents: number; mttrMinutes: number; majorOrCritical: number }[];
  topCauses: { cause: string; count: number }[];
  repeatOffenders: { asset: string; district: string; outages: number; downtimeHours: number; lastOutageDaysAgo: number }[];
  districtBurden: { district: string; incidents: number; downtimeHours: number }[];
  peakFailureHours: { hour: string; share: number }[];
  longestOutage: { asset: string; cause: string; hours: number } | null;
  recentLog: { daysAgo: number; asset: string; cause: string; severity: Sev; minutes: number }[];
}

export function summarizeHistory(log: PastIncident[]): HistorySummary {
  const count = <T,>(list: T[], key: (x: T) => string) => {
    const m = new Map<string, number>();
    list.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const last30 = log.filter((i) => i.daysAgo <= 30).length;
  const previous30 = log.filter((i) => i.daysAgo > 30 && i.daysAgo <= 60).length;
  const hours = (min: number) => Math.round((min / 60) * 10) / 10;

  const cats = [...new Set(log.map((i) => i.category))].map((category) => {
    const l = log.filter((i) => i.category === category);
    return { category, incidents: l.length, mttrMinutes: Math.round(l.reduce((s, i) => s + i.durationMin, 0) / l.length), majorOrCritical: l.filter((i) => i.severity === "major" || i.severity === "critical").length };
  }).sort((a, b) => b.incidents - a.incidents);

  const byAsset = new Map<string, PastIncident[]>();
  log.forEach((i) => byAsset.set(i.assetName, [...(byAsset.get(i.assetName) ?? []), i]));
  const offenders = [...byAsset.entries()]
    .map(([asset, l]) => ({ asset, district: l[0].district, outages: l.length, downtimeHours: hours(l.reduce((s, i) => s + i.durationMin, 0)), lastOutageDaysAgo: Math.min(...l.map((i) => i.daysAgo)) }))
    .sort((a, b) => b.downtimeHours - a.downtimeHours)
    .slice(0, 6);

  const districts = [...new Set(log.map((i) => i.district))].map((district) => {
    const l = log.filter((i) => i.district === district);
    return { district, incidents: l.length, downtimeHours: hours(l.reduce((s, i) => s + i.durationMin, 0)) };
  }).sort((a, b) => b.downtimeHours - a.downtimeHours);

  const longest = [...log].sort((a, b) => b.durationMin - a.durationMin)[0];

  return {
    windowDays: HISTORY_DAYS,
    note: "Simulated operations record for Ithaca — modelled history, not real-world data.",
    totalIncidents: log.length,
    last30,
    previous30,
    trendPct: previous30 ? Math.round(((last30 - previous30) / previous30) * 100) : 0,
    totalDowntimeHours: hours(log.reduce((s, i) => s + i.durationMin, 0)),
    severityMix: { minor: log.filter((i) => i.severity === "minor").length, moderate: log.filter((i) => i.severity === "moderate").length, major: log.filter((i) => i.severity === "major").length, critical: log.filter((i) => i.severity === "critical").length },
    byCategory: cats,
    topCauses: count(log, (i) => i.cause).slice(0, 5).map(([cause, c]) => ({ cause, count: c })),
    repeatOffenders: offenders,
    districtBurden: districts,
    peakFailureHours: count(log, (i) => `${String(i.hour).padStart(2, "0")}:00`).slice(0, 3).map(([hour, c]) => ({ hour, share: Math.round((c / log.length) * 100) })),
    longestOutage: longest ? { asset: longest.assetName, cause: longest.cause, hours: hours(longest.durationMin) } : null,
    recentLog: [...log].sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 8).map((i) => ({ daysAgo: i.daysAgo, asset: i.assetName, cause: i.cause, severity: i.severity, minutes: i.durationMin })),
  };
}

/**
 * Builds the operations record from the incidents actually stored in the database, so the
 * advisors, charts and Incidents page all talk about the same numbers. Falls back to the
 * generated record (buildHistory) only when there are too few real incidents to analyse.
 */
export function historyFromIncidents(incidents: Incident[], components: InfrastructureComponent[]): PastIncident[] {
  const byId = new Map(components.map((c) => [c.id, c]));
  const now = Date.now();
  return incidents.flatMap((i, n) => {
    const asset = byId.get(i.componentId);
    if (!asset) return [];
    const start = new Date(i.startTime);
    const daysAgo = Math.max(1, Math.ceil((now - start.getTime()) / 86_400_000));
    if (daysAgo > HISTORY_DAYS + 1) return [];
    return [{
      id: i.incidentId ?? `H-${n}`,
      daysAgo,
      hour: start.getHours(),
      assetId: asset.id,
      assetName: asset.name,
      category: asset.category,
      district: asset.district,
      cause: i.cause ?? i.incidentType.replace(/_/g, " "),
      severity: i.severity,
      durationMin: i.durationMinutes ?? i.estimatedImpact.estimatedRecoveryMinutes,
      downstreamAssets: i.estimatedImpact.downstreamAffectedCount,
      populationAffectedPct: i.estimatedImpact.populationExposedPct,
    }];
  });
}
