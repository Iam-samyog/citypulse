import type { RepairOperation } from "@/types/recovery";
import { evaluateNetwork, type ComponentState } from "./failureEngine";
import { InfrastructureGraph } from "./graph";

/** A repair only counts once it is both finished and verified on site. */
export function isRepairComplete(repair: RepairOperation): boolean {
  return repair.repairStatus === "restored" && repair.verificationStatus === "verified";
}

/**
 * Recalculates the whole network after a repair. `failedComponentIds` is
 * every component currently failed at source (the origins of open
 * incidents). A completed repair removes its component from that set;
 * everything downstream then recovers, or not, on its own supply.
 */
export function applyRepair(
  graph: InfrastructureGraph,
  repair: RepairOperation,
  failedComponentIds: Iterable<string>
): Map<string, ComponentState> {
  if (!graph.getComponent(repair.componentId)) {
    throw new Error(`Unknown component: ${repair.componentId}`);
  }
  const stillFailed = new Set(failedComponentIds);
  if (isRepairComplete(repair)) stillFailed.delete(repair.componentId);
  return evaluateNetwork(graph, stillFailed);
}
