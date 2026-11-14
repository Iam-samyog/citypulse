import type { OperationalStatus } from "./infrastructure";

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
  previousStatus: OperationalStatus;
  newStatus: OperationalStatus;
  distanceFromOrigin: number; // hops in the dependency graph
}

export interface ImpactEstimate {
  directlyFailedCount: number;
  downstreamAffectedCount: number;
  affectedDistricts: string[];
  populationExposedPct: number;
  criticalFacilitiesAffected: string[];
  estimatedRecoveryMinutes: number;
  severity: IncidentSeverity;
}

export interface Incident {
  incidentId: string;
  componentId: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  startTime: string; // ISO timestamp
  affectedComponents: AffectedComponentRecord[];
  affectedZones: string[];
  estimatedImpact: ImpactEstimate;
  incidentStatus: IncidentStatus;
}
