import type { InfrastructureComponent, OperationalStatus } from "@/types/infrastructure";
import type { AffectedComponentRecord } from "@/types/incident";
import { InfrastructureGraph } from "./graph";

export interface FailureResult {
  originComponentId: string;
  affectedComponents: AffectedComponentRecord[];
  finalStatuses: Map<string, OperationalStatus>;
}

/**
 * Deterministically propagates a failure from `originComponentId` through
 * the dependency graph.
 *
 * Rule of thumb (keep this simple and explainable for judges):
 *  1. The origin component is marked FAILED.
 *  2. For every downstream component (in BFS order so upstream effects are
 *     resolved before downstream ones), sum the available capacity it still
 *     receives from all its upstream dependencies plus its own backup
 *     capacity.
 *  3. If available capacity >= requiredInputCapacity * operationalThreshold,
 *     the component stays OPERATIONAL.
 *  4. Else if available capacity >= requiredInputCapacity * 0.5 (or it has
 *     backup capacity covering the gap), it becomes DEGRADED / AT_RISK.
 *  5. Else it becomes FAILED, and its own downstream effects are evaluated
 *     in turn.
 *
 * This is intentionally a simple, auditable scoring model — not a physical
 * power-flow simulation — so it stays deterministic and demo-friendly.
 */
export function simulateFailure(
  graph: InfrastructureGraph,
  originComponentId: string,
  originStatus: OperationalStatus = "failed"
): FailureResult {
  const origin = graph.getComponent(originComponentId);
  if (!origin) {
    throw new Error(`Unknown component: ${originComponentId}`);
  }

  const closure = graph.getDownstreamClosure(originComponentId);
  const orderedIds = Array.from(closure.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);

  const finalStatuses = new Map<string, OperationalStatus>();
  const affectedComponents: AffectedComponentRecord[] = [];

  finalStatuses.set(originComponentId, originStatus);

  for (const componentId of orderedIds) {
    if (componentId === originComponentId) continue;

    const component = graph.getComponent(componentId);
    if (!component) continue;

    const previousStatus = component.operationalStatus;
    const newStatus = resolveComponentStatus(graph, component, finalStatuses);
    finalStatuses.set(componentId, newStatus);

    if (newStatus !== previousStatus) {
      affectedComponents.push({
        componentId,
        previousStatus,
        newStatus,
        distanceFromOrigin: closure.get(componentId) ?? -1,
      });
    }
  }

  return { originComponentId, affectedComponents, finalStatuses };
}

function resolveComponentStatus(
  graph: InfrastructureGraph,
  component: InfrastructureComponent,
  resolvedStatuses: Map<string, OperationalStatus>
): OperationalStatus {
  const upstreamDeps = graph.getUpstream(component.componentId);

  // No upstream dependency info -> nothing changed for this component.
  if (upstreamDeps.length === 0) {
    return component.operationalStatus;
  }

  let availableCapacity = component.backupCapacity;

  for (const dep of upstreamDeps) {
    const sourceStatus =
      resolvedStatuses.get(dep.sourceComponentId) ??
      graph.getComponent(dep.sourceComponentId)?.operationalStatus ??
      "operational";

    const sourceIsSupplying =
      sourceStatus === "operational" || sourceStatus === "restored";

    if (sourceIsSupplying) {
      availableCapacity += dep.requiredCapacity;
    } else if (dep.hasBackup) {
      // Backup line covers this dependency's requirement even if the
      // primary source failed.
      availableCapacity += dep.requiredCapacity * 0.75;
    }
  }

  const required = component.requiredInputCapacity;
  const threshold = component.operationalThreshold;

  if (required === 0 || availableCapacity >= required * threshold) {
    return "operational";
  }
  if (availableCapacity >= required * 0.5) {
    return component.criticality === "critical" ? "at_risk" : "degraded";
  }
  return "failed";
}
