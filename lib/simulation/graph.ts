import type {
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";

export interface GraphValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CriticalPath {
  componentIds: string[];
  dependencyIds: string[];
  /** Sum of the criticality of every component on the path. */
  totalCriticality: number;
}

/**
 * Adjacency-list view of the city's dependency network. An edge
 * source -> target means the target DEPENDS ON the source, so "downstream"
 * is the direction a failure travels. Pure TypeScript: no Mongo, no React.
 */
export class InfrastructureGraph {
  private readonly components = new Map<string, InfrastructureComponent>();
  private readonly outgoing = new Map<string, InfrastructureDependency[]>();
  private readonly incoming = new Map<string, InfrastructureDependency[]>();
  private readonly dependencies: InfrastructureDependency[];

  constructor(
    components: InfrastructureComponent[],
    dependencies: InfrastructureDependency[]
  ) {
    this.dependencies = dependencies;
    for (const component of components) {
      this.components.set(component.id, component);
      this.outgoing.set(component.id, []);
      this.incoming.set(component.id, []);
    }
    for (const dependency of dependencies) {
      this.outgoing.get(dependency.sourceId)?.push(dependency);
      this.incoming.get(dependency.targetId)?.push(dependency);
    }
  }

  getComponent(id: string): InfrastructureComponent | undefined {
    return this.components.get(id);
  }

  allComponents(): InfrastructureComponent[] {
    return Array.from(this.components.values());
  }

  allDependencies(): InfrastructureDependency[] {
    return this.dependencies;
  }

  /** Edges where `id` is the target: what `id` needs. */
  getIncomingDependencies(id: string): InfrastructureDependency[] {
    return this.incoming.get(id) ?? [];
  }

  /** Edges where `id` is the source: who relies on `id`. */
  getOutgoingDependencies(id: string): InfrastructureDependency[] {
    return this.outgoing.get(id) ?? [];
  }

  /** Components `id` directly depends on. */
  getUpstream(id: string): InfrastructureComponent[] {
    return this.resolve(this.getIncomingDependencies(id).map((d) => d.sourceId));
  }

  /** Components that directly depend on `id`. */
  getDownstream(id: string): InfrastructureComponent[] {
    return this.resolve(this.getOutgoingDependencies(id).map((d) => d.targetId));
  }

  /** Everything reachable downstream of `id`, with hop distance (the root is 0). */
  getDownstreamClosure(id: string): Map<string, number> {
    return this.closure(id, (current) =>
      this.getOutgoingDependencies(current).map((d) => d.targetId)
    );
  }

  /** Everything `id` transitively depends on, with hop distance (the root is 0). */
  getUpstreamClosure(id: string): Map<string, number> {
    return this.closure(id, (current) =>
      this.getIncomingDependencies(current).map((d) => d.sourceId)
    );
  }

  /**
   * The dependency chain that matters most if `sourceId` fails: the
   * downstream path with the highest total criticality. With `targetId`,
   * the heaviest path between the two instead. Returns null when the graph
   * is cyclic or no path exists.
   */
  getCriticalPath(sourceId: string, targetId?: string): CriticalPath | null {
    const order = this.topologicalOrder();
    if (!order || !this.components.has(sourceId)) return null;
    if (targetId && !this.components.has(targetId)) return null;

    // best[id] = heaviest path that starts at `id`, built leaves-first.
    const best = new Map<string, CriticalPath | null>();
    for (const id of [...order].reverse()) {
      const own = this.components.get(id)!.criticality;
      let chosen: CriticalPath | null =
        !targetId || id === targetId
          ? { componentIds: [id], dependencyIds: [], totalCriticality: own }
          : null;

      if (id !== targetId) {
        for (const dependency of this.getOutgoingDependencies(id)) {
          const tail = best.get(dependency.targetId);
          if (!tail) continue;
          const total = own + tail.totalCriticality;
          if (!chosen || total > chosen.totalCriticality) {
            chosen = {
              componentIds: [id, ...tail.componentIds],
              dependencyIds: [dependency.id, ...tail.dependencyIds],
              totalCriticality: total,
            };
          }
        }
      }
      best.set(id, chosen);
    }
    return best.get(sourceId) ?? null;
  }

  /** Sources before the things that depend on them; null if the graph has a cycle. */
  topologicalOrder(): string[] | null {
    const remaining = new Map<string, number>();
    for (const id of this.components.keys()) {
      remaining.set(
        id,
        this.getIncomingDependencies(id).filter((d) => this.components.has(d.sourceId)).length
      );
    }
    const ready = [...remaining].filter(([, count]) => count === 0).map(([id]) => id).sort();
    const order: string[] = [];

    while (ready.length > 0) {
      const id = ready.shift()!;
      order.push(id);
      for (const dependency of this.getOutgoingDependencies(id)) {
        if (!remaining.has(dependency.targetId)) continue;
        const left = remaining.get(dependency.targetId)! - 1;
        remaining.set(dependency.targetId, left);
        if (left === 0) ready.push(dependency.targetId);
      }
    }
    return order.length === this.components.size ? order : null;
  }

  validateGraph(): GraphValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    const seenDependencyIds = new Set<string>();
    const seenPairs = new Set<string>();
    for (const dependency of this.dependencies) {
      const label = `${dependency.id} (${dependency.sourceId} -> ${dependency.targetId})`;
      if (seenDependencyIds.has(dependency.id)) errors.push(`Duplicate dependency id ${dependency.id}`);
      seenDependencyIds.add(dependency.id);

      if (!this.components.has(dependency.sourceId)) errors.push(`${label}: unknown source`);
      if (!this.components.has(dependency.targetId)) errors.push(`${label}: unknown target`);
      if (dependency.sourceId === dependency.targetId) errors.push(`${label}: component depends on itself`);
      if (dependency.requiredCapacity <= 0) errors.push(`${label}: requiredCapacity must be positive`);

      const pair = `${dependency.sourceId}>${dependency.targetId}>${dependency.dependencyType}`;
      if (seenPairs.has(pair)) warnings.push(`${label}: duplicate ${dependency.dependencyType} edge`);
      seenPairs.add(pair);
    }

    for (const component of this.components.values()) {
      const { id } = component;
      if (component.maxCapacity <= 0) errors.push(`${id}: maxCapacity must be positive`);
      if (component.currentLoad < 0 || component.backupCapacityRemaining < 0) {
        errors.push(`${id}: load and backup reserve cannot be negative`);
      }
      if (!Number.isInteger(component.criticality) || component.criticality < 1 || component.criticality > 5) {
        errors.push(`${id}: criticality must be an integer from 1 to 5`);
      }
      if (component.currentLoad > component.maxCapacity) {
        warnings.push(`${id}: currentLoad ${component.currentLoad} exceeds maxCapacity ${component.maxCapacity}`);
      }

      const committed = this.getOutgoingDependencies(id).reduce((sum, d) => sum + d.requiredCapacity, 0);
      if (committed > component.maxCapacity) {
        warnings.push(`${id}: downstream demand ${committed} exceeds maxCapacity ${component.maxCapacity}`);
      }

      const incoming = this.getIncomingDependencies(id);
      if (incoming.length === 0 && committed === 0) warnings.push(`${id}: isolated, no dependencies either way`);
      if (incoming.some((d) => d.hasBackup) && component.backupCapacityRemaining === 0) {
        warnings.push(`${id}: has a backup-capable dependency but no backup reserve`);
      }
    }

    if (errors.length === 0 && this.topologicalOrder() === null) {
      errors.push("Dependency cycle detected: the cascade engine needs an acyclic graph");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private resolve(ids: string[]): InfrastructureComponent[] {
    return Array.from(new Set(ids))
      .map((id) => this.components.get(id))
      .filter((c): c is InfrastructureComponent => Boolean(c));
  }

  private closure(rootId: string, next: (id: string) => string[]): Map<string, number> {
    const distances = new Map<string, number>([[rootId, 0]]);
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of next(current)) {
        if (distances.has(neighbor)) continue;
        distances.set(neighbor, distances.get(current)! + 1);
        queue.push(neighbor);
      }
    }
    return distances;
  }
}
