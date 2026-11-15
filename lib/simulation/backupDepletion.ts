import type { ComponentCategory, ComponentStatus } from "@/types/infrastructure";
import { evaluateNetwork, type ComponentState } from "./failureEngine";
import { InfrastructureGraph } from "./graph";

const DEFAULT_RUNTIME_MINUTES: Record<ComponentCategory, number> = {
  electrical: 120,
  water: 60,
  hospital: 90,
  emergency: 75,
  comms: 45,
  transit: 30,
};

export interface BackupDepletionTransition {
  componentId: string;
  simulationTimeMinutes: number;
  previousStatus: ComponentStatus;
  newStatus: ComponentStatus;
  previousServiceLevel: number;
  newServiceLevel: number;
  backupRemaining: number;
  reason: "backup_warning" | "backup_depleted" | "network_rebalanced";
}

export interface BackupEnduranceEstimate {
  componentId: string;
  drawRate: number;
  ratedRuntimeMinutes: number;
  estimatedMinutesRemaining: number;
}

export interface BackupDepletionProjection {
  horizonMinutes: number;
  stepMinutes: number;
  transitions: BackupDepletionTransition[];
  endurance: BackupEnduranceEstimate[];
  finalStates: Map<string, ComponentState>;
}

export interface BackupProjectionOptions {
  horizonMinutes?: number;
  stepMinutes?: number;
}

/** Rated endurance at full reserve draw. Actual runtime scales inversely with draw. */
export function getBackupRuntimeMinutes(category: ComponentCategory): number {
  return DEFAULT_RUNTIME_MINUTES[category];
}

/**
 * Projects a failed network forward while consuming finite backup energy.
 *
 * `backupCapacityRemaining` is the reserve's maximum discharge rate. Its
 * stored energy is that rate multiplied by the category's rated runtime.
 * Drawing half the rated capacity therefore lasts roughly twice as long.
 * Every step recalculates the complete graph because one depleted reserve
 * can change rationing and push failures into otherwise unrelated branches.
 */
export function projectBackupDepletion(
  graph: InfrastructureGraph,
  failedComponentIds: Iterable<string>,
  options: BackupProjectionOptions = {}
): BackupDepletionProjection {
  const horizonMinutes = options.horizonMinutes ?? 240;
  const stepMinutes = options.stepMinutes ?? 5;
  if (horizonMinutes <= 0 || stepMinutes <= 0) {
    throw new Error("Backup projection horizon and step must be positive");
  }

  const failed = Array.from(new Set(failedComponentIds));
  const reserveEnergy = new Map<string, number>();
  const maxDischarge = new Map<string, number>();
  for (const component of graph.allComponents()) {
    maxDischarge.set(component.id, component.backupCapacityRemaining);
    reserveEnergy.set(
      component.id,
      component.backupCapacityRemaining * getBackupRuntimeMinutes(component.category)
    );
  }

  let states = evaluateNetwork(graph, failed, maxDischarge);
  const endurance: BackupEnduranceEstimate[] = [];
  for (const [componentId, state] of states) {
    if (state.backupUsed <= 0) continue;
    const component = graph.getComponent(componentId)!;
    endurance.push({
      componentId,
      drawRate: state.backupUsed,
      ratedRuntimeMinutes: getBackupRuntimeMinutes(component.category),
      estimatedMinutesRemaining: Math.floor(
        (reserveEnergy.get(componentId) ?? 0) / state.backupUsed
      ),
    });
  }
  endurance.sort(
    (a, b) => a.estimatedMinutesRemaining - b.estimatedMinutesRemaining || a.componentId.localeCompare(b.componentId)
  );

  const transitions: BackupDepletionTransition[] = [];
  const warned = new Set<string>();
  const depleted = new Set<string>();

  for (let time = stepMinutes; time <= horizonMinutes; time += stepMinutes) {
    for (const [componentId, state] of states) {
      if (state.backupUsed <= 0) continue;
      reserveEnergy.set(
        componentId,
        Math.max(0, (reserveEnergy.get(componentId) ?? 0) - state.backupUsed * stepMinutes)
      );
    }

    const available = new Map<string, number>();
    for (const component of graph.allComponents()) {
      const energy = reserveEnergy.get(component.id) ?? 0;
      const maximum = maxDischarge.get(component.id) ?? 0;
      available.set(component.id, Math.min(maximum, energy / stepMinutes));

      const originalEnergy = maximum * getBackupRuntimeMinutes(component.category);
      if (
        energy > 0 &&
        originalEnergy > 0 &&
        energy / originalEnergy <= 0.25 &&
        !warned.has(component.id) &&
        (states.get(component.id)?.backupUsed ?? 0) > 0
      ) {
        warned.add(component.id);
        const state = states.get(component.id)!;
        transitions.push({
          componentId: component.id,
          simulationTimeMinutes: time,
          previousStatus: state.status,
          newStatus: state.status,
          previousServiceLevel: state.serviceLevel,
          newServiceLevel: state.serviceLevel,
          backupRemaining: energy,
          reason: "backup_warning",
        });
      }
    }

    const nextStates = evaluateNetwork(graph, failed, available);
    for (const [componentId, next] of nextStates) {
      const previous = states.get(componentId)!;
      const remaining = reserveEnergy.get(componentId) ?? 0;
      const wasUsingBackup = previous.backupUsed > 0;
      const justDepleted = wasUsingBackup && remaining <= 0 && !depleted.has(componentId);
      const statusChanged = previous.status !== next.status;
      const serviceChanged = Math.abs(previous.serviceLevel - next.serviceLevel) >= 0.01;
      if (!justDepleted && !statusChanged && !serviceChanged) continue;

      if (justDepleted) depleted.add(componentId);
      transitions.push({
        componentId,
        simulationTimeMinutes: time,
        previousStatus: previous.status,
        newStatus: next.status,
        previousServiceLevel: previous.serviceLevel,
        newServiceLevel: next.serviceLevel,
        backupRemaining: remaining,
        reason: justDepleted ? "backup_depleted" : "network_rebalanced",
      });
    }
    states = nextStates;

    const reservesInUse = Array.from(states.values()).some((state) => state.backupUsed > 0);
    if (!reservesInUse) break;
  }

  transitions.sort(
    (a, b) => a.simulationTimeMinutes - b.simulationTimeMinutes || a.componentId.localeCompare(b.componentId)
  );
  return { horizonMinutes, stepMinutes, transitions, endurance, finalStates: states };
}
