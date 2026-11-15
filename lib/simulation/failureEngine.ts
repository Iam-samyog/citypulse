import type {
  ComponentStatus,
  DependencyType,
  InfrastructureDependency,
} from "@/types/infrastructure";
import type { AffectedComponentRecord } from "@/types/incident";
import { InfrastructureGraph } from "./graph";

/** At or above this service level a component is fully working. */
export const OPERATIONAL_THRESHOLD = 0.9;
/** Below this service level a component is offline and delivers nothing. */
export const DEGRADED_THRESHOLD = 0.5;

export interface ComponentState {
  status: ComponentStatus;
  /** Share of its needs this component is getting, 0 to 1. */
  serviceLevel: number;
  /** Backup reserve drawn to reach that service level. */
  backupUsed: number;
}

export interface FailureResult {
  originComponentId: string;
  affectedComponents: AffectedComponentRecord[];
  states: Map<string, ComponentState>;
}

/**
 * Works out the state of every component given a set of failed ones.
 * Deterministic: the same graph and the same failures always give the same
 * answer. Components are visited sources-first, and for each one:
 *
 *  1. Output. A component can deliver maxCapacity x its own service level.
 *     Offline components deliver nothing.
 *  2. Rationing. That output goes to its dependents in order of criticality
 *     (highest first, ties by id), each taking up to its edge's
 *     requiredCapacity. A hospital is served before a ferry terminal.
 *  3. Need. Per dependency type, a component needs the largest
 *     requiredCapacity among its edges of that type. Several edges of one
 *     type are alternates: a second, smaller feeder is partial redundancy.
 *  4. Backup. If an edge marked hasBackup falls short, the component covers
 *     the gap from backupCapacityRemaining, one shared reserve per component.
 *  5. Status. Service level is the worst ratio across its dependency types:
 *     >= 0.9 operational (or "backup" if the reserve was needed),
 *     >= 0.5 degraded, otherwise offline.
 */
export function evaluateNetwork(
  graph: InfrastructureGraph,
  failedComponentIds: Iterable<string>,
  availableBackupByComponent?: ReadonlyMap<string, number>
): Map<string, ComponentState> {
  const order = graph.topologicalOrder();
  if (!order) {
    throw new Error("Cannot simulate: the dependency graph contains a cycle");
  }

  const failed = new Set(failedComponentIds);
  const states = new Map<string, ComponentState>();
  const delivered = new Map<string, number>();

  for (const id of order) {
    const component = graph.getComponent(id)!;
    const state = failed.has(id)
      ? { status: "offline" as const, serviceLevel: 0, backupUsed: 0 }
      : resolveState(
          graph.getIncomingDependencies(id),
          availableBackupByComponent?.get(id) ?? component.backupCapacityRemaining,
          delivered
        );
    states.set(id, state);

    let output = state.status === "offline" ? 0 : component.maxCapacity * state.serviceLevel;
    for (const dependency of rationingOrder(graph, graph.getOutgoingDependencies(id))) {
      const share = Math.min(dependency.requiredCapacity, output);
      delivered.set(dependency.id, share);
      output -= share;
    }
  }

  return states;
}

/** Fails `originComponentId` on top of anything in `alreadyFailedIds` and reports what changed. */
export function simulateFailure(
  graph: InfrastructureGraph,
  originComponentId: string,
  alreadyFailedIds: Iterable<string> = []
): FailureResult {
  if (!graph.getComponent(originComponentId)) {
    throw new Error(`Unknown component: ${originComponentId}`);
  }

  const states = evaluateNetwork(graph, [...alreadyFailedIds, originComponentId]);
  const distances = graph.getDownstreamClosure(originComponentId);

  const affectedComponents: AffectedComponentRecord[] = [];
  for (const [componentId, state] of states) {
    if (componentId === originComponentId) continue;
    const previousStatus = graph.getComponent(componentId)!.status;
    if (state.status === previousStatus) continue;
    affectedComponents.push({
      componentId,
      previousStatus,
      newStatus: state.status,
      distanceFromOrigin: distances.get(componentId) ?? -1,
      serviceLevel: state.serviceLevel,
      backupUsed: state.backupUsed,
    });
  }
  affectedComponents.sort(
    (a, b) => a.distanceFromOrigin - b.distanceFromOrigin || a.componentId.localeCompare(b.componentId)
  );

  return { originComponentId, affectedComponents, states };
}

function rationingOrder(
  graph: InfrastructureGraph,
  dependencies: InfrastructureDependency[]
): InfrastructureDependency[] {
  const criticality = (d: InfrastructureDependency) => graph.getComponent(d.targetId)?.criticality ?? 0;
  return [...dependencies].sort(
    (a, b) => criticality(b) - criticality(a) || a.targetId.localeCompare(b.targetId) || a.id.localeCompare(b.id)
  );
}

function resolveState(
  incoming: InfrastructureDependency[],
  backupReserve: number,
  delivered: Map<string, number>
): ComponentState {
  if (incoming.length === 0) {
    return { status: "operational", serviceLevel: 1, backupUsed: 0 };
  }

  const byType = new Map<DependencyType, InfrastructureDependency[]>();
  for (const dependency of incoming) {
    byType.set(dependency.dependencyType, [...(byType.get(dependency.dependencyType) ?? []), dependency]);
  }

  let reserve = backupReserve;
  let serviceLevel = 1;

  for (const type of [...byType.keys()].sort()) {
    const edges = byType.get(type)!;
    const need = Math.max(...edges.map((d) => d.requiredCapacity));
    const supplied = Math.min(need, edges.reduce((sum, d) => sum + (delivered.get(d.id) ?? 0), 0));

    let covered = supplied;
    const shortfall = need - supplied;
    const backupAllowed = edges.some((d) => d.hasBackup && (delivered.get(d.id) ?? 0) < d.requiredCapacity);
    if (shortfall > 0 && backupAllowed) {
      const drawn = Math.min(shortfall, reserve);
      reserve -= drawn;
      covered += drawn;
    }
    serviceLevel = Math.min(serviceLevel, covered / need);
  }

  const backupUsed = backupReserve - reserve;
  const status: ComponentStatus =
    serviceLevel >= OPERATIONAL_THRESHOLD
      ? backupUsed > 0
        ? "backup"
        : "operational"
      : serviceLevel >= DEGRADED_THRESHOLD
        ? "degraded"
        : "offline";

  return { status, serviceLevel, backupUsed };
}
