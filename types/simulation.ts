import type { OperationalStatus } from "./infrastructure";

export type SimulationEventType =
  | "failure_triggered"
  | "component_degraded"
  | "component_restored"
  | "repair_started"
  | "repair_verified";

export interface SimulationEvent {
  eventId: string;
  incidentId: string;
  componentId: string;
  eventType: SimulationEventType;
  timestamp: string; // ISO timestamp
  previousState: OperationalStatus;
  newState: OperationalStatus;
  simulationTimeMinutes: number; // T+ minutes from incident start
}

export type AIProvider = "gemini" | "grok";

export type AIAnalysisType =
  | "incident_explanation"
  | "impact_summary"
  | "recovery_review"
  | "qa_response";

export interface AIAnalysis {
  analysisId: string;
  incidentId: string;
  provider: AIProvider;
  analysisType: AIAnalysisType;
  generatedSummary: string;
  recommendations: string[];
  createdAt: string; // ISO timestamp
}
