import type { ComponentStatus } from "./infrastructure";

export type SimulationEventType =
  | "failure_triggered"
  | "component_degraded"
  | "component_restored"
  | "repair_started"
  | "repair_verified"
  | "backup_warning"
  | "backup_depleted"
  | "network_rebalanced";

export interface SimulationEvent {
  eventId: string;
  incidentId: string;
  componentId: string;
  eventType: SimulationEventType;
  timestamp: string; // ISO timestamp
  previousState: ComponentStatus;
  newState: ComponentStatus;
  simulationTimeMinutes: number; // T+ minutes from incident start
  /** Human-readable reason for projected or operator-facing events. */
  detail?: string;
  /** Remaining stored backup energy in capacity-minutes, when applicable. */
  backupRemaining?: number;
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
