import type { InfrastructureComponent } from "@/types/infrastructure";
import type { AffectedComponentRecord, ImpactEstimate, IncidentSeverity } from "@/types/incident";
import { InfrastructureGraph } from "./graph";

/**
 * Translates a raw failure-propagation result into the human-readable
 * impact estimate shown in the dashboard and handed to the AI layer.
 *
 * These numbers are derived entirely from the simulated city model — they
 * are illustrative, not real municipal data (see project README).
 */
export function calculateImpact(
  graph: InfrastructureGraph,
  originComponentId: string,
  affectedComponents: AffectedComponentRecord[]
): ImpactEstimate {
  const failedOrDegraded = affectedComponents.filter(
    (a) => a.newStatus === "failed" || a.newStatus === "degraded" || a.newStatus === "at_risk"
  );

  const directlyFailedCount = affectedComponents.filter(
    (a) => a.distanceFromOrigin === 0 || a.componentId === originComponentId
  ).length || 1;

  const downstreamAffectedCount = failedOrDegraded.length;

  const affectedComponentObjs = failedOrDegraded
    .map((a) => graph.getComponent(a.componentId))
    .filter((c): c is InfrastructureComponent => Boolean(c));

  const affectedDistricts = Array.from(
    new Set(affectedComponentObjs.map((c) => c.district))
  );

  const criticalFacilitiesAffected = affectedComponentObjs
    .filter((c) => c.criticality === "critical" || c.category === "hospital")
    .map((c) => c.componentId);

  const totalResidentialCapacity = graph
    .allComponents()
    .filter((c) => c.category === "residential")
    .reduce((sum, c) => sum + c.capacity, 0);

  const affectedResidentialCapacity = affectedComponentObjs
    .filter((c) => c.category === "residential")
    .reduce((sum, c) => sum + c.capacity, 0);

  const populationExposedPct =
    totalResidentialCapacity > 0
      ? Math.round((affectedResidentialCapacity / totalResidentialCapacity) * 1000) / 10
      : 0;

  const estimatedRecoveryMinutes = estimateRecoveryMinutes(
    downstreamAffectedCount,
    criticalFacilitiesAffected.length
  );

  const severity = estimateSeverity(
    downstreamAffectedCount,
    criticalFacilitiesAffected.length,
    populationExposedPct
  );

  return {
    directlyFailedCount,
    downstreamAffectedCount,
    affectedDistricts,
    populationExposedPct,
    criticalFacilitiesAffected,
    estimatedRecoveryMinutes,
    severity,
  };
}

function estimateRecoveryMinutes(affectedCount: number, criticalCount: number): number {
  const base = 30;
  return base + affectedCount * 15 + criticalCount * 30;
}

function estimateSeverity(
  affectedCount: number,
  criticalCount: number,
  populationExposedPct: number
): IncidentSeverity {
  if (criticalCount > 0 && populationExposedPct > 25) return "critical";
  if (criticalCount > 0 || populationExposedPct > 15) return "major";
  if (affectedCount > 3) return "moderate";
  return "minor";
}
