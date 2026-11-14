import type {
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";

/**
 * In-memory representation of the city's infrastructure dependency graph.
 * Components are nodes; dependencies are directed edges (source -> target
 * means target DEPENDS ON source, e.g. substation -> water pump).
 */
export class InfrastructureGraph {
  private components = new Map<string, InfrastructureComponent>();
  private outgoing = new Map<string, InfrastructureDependency[]>();
  private incoming = new Map<string, InfrastructureDependency[]>();

  constructor(
    components: InfrastructureComponent[],
    dependencies: InfrastructureDependency[]
  ) {
    for (const c of components) this.components.set(c.componentId, c);
    for (const d of dependencies) {
      this.outgoing.set(d.sourceComponentId, [
        ...(this.outgoing.get(d.sourceComponentId) ?? []),
        d,
      ]);
      this.incoming.set(d.targetComponentId, [
        ...(this.incoming.get(d.targetComponentId) ?? []),
        d,
      ]);
    }
  }

  getComponent(id: string): InfrastructureComponent | undefined {
    return this.components.get(id);
  }

  allComponents(): InfrastructureComponent[] {
    return Array.from(this.components.values());
  }

  /** Dependencies where `id` is the source (i.e. things that depend on `id`). */
  getDownstream(id: string): InfrastructureDependency[] {
    return this.outgoing.get(id) ?? [];
  }

  /** Dependencies where `id` is the target (i.e. things `id` depends on). */
  getUpstream(id: string): InfrastructureDependency[] {
    return this.incoming.get(id) ?? [];
  }

  /**
   * Breadth-first traversal of everything downstream of `rootId`, returning
   * each reachable component paired with its hop distance from the root.
   * Used as the candidate set for failure propagation — NOT the final
   * failure determination, which requires capacity analysis (see
   * failureEngine.ts).
   */
  getDownstreamClosure(rootId: string): Map<string, number> {
    const distances = new Map<string, number>([[rootId, 0]]);
    const queue: string[] = [rootId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDistance = distances.get(current)!;

      for (const dep of this.getDownstream(current)) {
        if (!distances.has(dep.targetComponentId)) {
          distances.set(dep.targetComponentId, currentDistance + 1);
          queue.push(dep.targetComponentId);
        }
      }
    }

    return distances;
  }
}
