import type { ComponentStatus } from "./infrastructure";

export type IncidentType =
  | "power_failure"
  | "water_main_break"
  | "pipeline_rupture"
  | "communication_outage"
  | "transportation_disruption"
  | "natural_disaster";

export type IncidentSeverity = "minor" | "moderate" | "major" | "critical";

export type IncidentStatus = "active" | "contained" | "recovering" | "resolved";

export interface AffectedComponentRecord {
  componentId: string;
  previousStatus: ComponentStatus;
  newStatus: ComponentStatus;
  /** Hops from the failed component, or -1 if not downstream of it. */
  distanceFromOrigin: number;
  /** Share of its needs the component is still getting, 0 to 1. */
  serviceLevel: number;
  backupUsed: number;
}

export interface ImpactEstimate {
  directlyFailedCount: number;
  downstreamAffectedCount: number;
  statusBreakdown: { offline: number; degraded: number; backup: number };
  affectedDistricts: string[];
  populationExposedPct: number;
  criticalFacilitiesAffected: string[];
  estimatedRecoveryMinutes: number;
  severity: IncidentSeverity;
}

export interface Incident {
  incidentId: string;
  /** The component that failed at source. */
  componentId: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  startTime: string;
  affectedComponents: AffectedComponentRecord[];
  affectedZones: string[];
  estimatedImpact: ImpactEstimate;
  incidentStatus: IncidentStatus;
  /** Root cause, e.g. "Transformer overload". Present on seeded and logged incidents. */
  cause?: string;
  /** Minutes from start until the failed asset was restored and verified. */
  durationMinutes?: number;
  resolvedAt?: string;
}
