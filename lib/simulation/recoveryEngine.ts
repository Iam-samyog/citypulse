import type { OperationalStatus } from "@/types/infrastructure";
import type { RepairOperation, RepairStage } from "@/types/recovery";
import { InfrastructureGraph } from "./graph";
import { simulateFailure } from "./failureEngine";

const STAGE_TO_STATUS: Partial<Record<RepairStage, OperationalStatus>> = {
  reported: "failed",
  crew_dispatched: "failed",
  inspection_in_progress: "failed",
  repair_in_progress: "repairing",
  awaiting_verification: "repairing",
  restored: "restored",
};

/**
 * Applies a verified repair to the graph's in-memory component state and
 * recalculates downstream availability by re-running the failure engine
 * from any components still in a failed/degraded state.
 *
 * Returns the updated status map for every component so the caller can
 * diff it against the previous simulation state and emit simulation_events.
 */
export function applyRepair(
  graph: InfrastructureGraph,
  repair: RepairOperation
): Map<string, OperationalStatus> {
  const component = graph.getComponent(repair.componentId);
  if (!component) {
    throw new Error(`Unknown component: ${repair.componentId}`);
  }

  const newStatus = STAGE_TO_STATUS[repair.repairStatus] ?? component.operationalStatus;

  if (repair.repairStatus === "restored" && repair.verificationStatus !== "verified") {
    // A repair cannot be marked restored in the model until verified on site.
    return new Map([[component.componentId, component.operationalStatus]]);
  }

  component.operationalStatus = newStatus;
  component.currentCapacity =
    newStatus === "restored" ? component.capacity : component.currentCapacity;

  // Re-evaluate anything still downstream of this component, in case
  // restoring it also restores services further down the chain.
  const result = simulateFailure(graph, component.componentId, newStatus);
  return result.finalStatuses;
}
