import type { ComponentStatus } from "@/types/infrastructure";
import type { ImpactEstimate, IncidentSeverity } from "@/types/incident";
import type { ComponentState } from "./failureEngine";
import { InfrastructureGraph } from "./graph";

/** How much of a district's service one component in this state takes away. */
const EXPOSURE_WEIGHT: Record<ComponentStatus, number> = {
  operational: 0,
  backup: 0.25,
  degraded: 0.5,
  offline: 1,
};

/**
 * Turns the engine's component states into the numbers shown to people.
 * Population exposure is an estimate from the simulated city model: each
 * district's residents are counted in proportion to how much of that
 * district's infrastructure is impaired.
 */
export function calculateImpact(
  graph: InfrastructureGraph,
  originComponentId: string,
  states: Map<string, ComponentState>,
  districtPopulations: Record<string, number>
): ImpactEstimate {
  const impaired = graph
    .allComponents()
    .filter((c) => c.id !== originComponentId && states.get(c.id)?.status !== "operational");

  const count = (status: ComponentStatus) =>
    impaired.filter((c) => states.get(c.id)?.status === status).length;
  const statusBreakdown = {
    offline: count("offline"),
    degraded: count("degraded"),
    backup: count("backup"),
  };

  const districtTotals = new Map<string, { components: number; exposure: number }>();
  for (const component of graph.allComponents()) {
    const totals = districtTotals.get(component.district) ?? { components: 0, exposure: 0 };
    totals.components += 1;
    totals.exposure += EXPOSURE_WEIGHT[states.get(component.id)?.status ?? "operational"];
    districtTotals.set(component.district, totals);
  }

  let totalPopulation = 0;
  let exposedPopulation = 0;
  const affectedDistricts: string[] = [];
  for (const [district, totals] of districtTotals) {
    const population = districtPopulations[district] ?? 0;
    totalPopulation += population;
    exposedPopulation += population * (totals.exposure / totals.components);
    if (totals.exposure > 0) affectedDistricts.push(district);
  }
  const populationExposedPct =
    totalPopulation > 0 ? Math.round((exposedPopulation / totalPopulation) * 1000) / 10 : 0;

  const criticalFacilitiesAffected = impaired
    .filter((c) => c.criticality === 5 || (c.criticality >= 4 && (c.category === "hospital" || c.category === "emergency")))
    .map((c) => c.id);

  return {
    directlyFailedCount: 1,
    downstreamAffectedCount: impaired.length,
    statusBreakdown,
    affectedDistricts: affectedDistricts.sort(),
    populationExposedPct,
    criticalFacilitiesAffected,
    estimatedRecoveryMinutes:
      45 + statusBreakdown.offline * 20 + statusBreakdown.degraded * 10 + statusBreakdown.backup * 5,
    severity: estimateSeverity(statusBreakdown.offline, criticalFacilitiesAffected.length, populationExposedPct),
  };
}

function estimateSeverity(offline: number, critical: number, populationExposedPct: number): IncidentSeverity {
  if (populationExposedPct >= 30 || critical >= 5) return "critical";
  if (populationExposedPct >= 12 || critical >= 2) return "major";
  if (offline >= 2 || critical >= 1) return "moderate";
  return "minor";
}
