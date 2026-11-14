export type RepairStage =
  | "reported"
  | "crew_dispatched"
  | "inspection_in_progress"
  | "repair_in_progress"
  | "awaiting_verification"
  | "restored";

export type VerificationStatus = "pending" | "verified" | "failed_verification";

export interface RepairOperation {
  repairId: string;
  incidentId: string;
  componentId: string;
  assignedCrew: string;
  repairStatus: RepairStage;
  estimatedCompletion: string; // ISO timestamp
  actualCompletion?: string; // ISO timestamp
  verificationStatus: VerificationStatus;
}
