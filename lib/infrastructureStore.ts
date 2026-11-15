import type { Db } from "mongodb";
import { collections } from "@/lib/mongodb";
import type { ComponentState } from "@/lib/simulation/failureEngine";
import { InfrastructureGraph } from "@/lib/simulation/graph";
import type { Incident } from "@/types/incident";
import type {
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";

const WITHOUT_MONGO_ID = { projection: { _id: 0 } } as const;

export async function loadInfrastructure(db: Db): Promise<{
  components: InfrastructureComponent[];
  dependencies: InfrastructureDependency[];
}> {
  const [components, dependencies] = await Promise.all([
    db
      .collection<InfrastructureComponent>(collections.infrastructureComponents)
      .find({}, WITHOUT_MONGO_ID)
      .sort({ id: 1 })
      .toArray(),
    db
      .collection<InfrastructureDependency>(collections.infrastructureDependencies)
      .find({}, WITHOUT_MONGO_ID)
      .sort({ id: 1 })
      .toArray(),
  ]);
  return { components, dependencies };
}

export async function loadGraph(db: Db): Promise<InfrastructureGraph> {
  const { components, dependencies } = await loadInfrastructure(db);
  return new InfrastructureGraph(components, dependencies);
}

/** Components that failed at source and have not been repaired yet. */
export async function loadFailedComponentIds(db: Db): Promise<string[]> {
  const open = await db
    .collection<Incident>(collections.incidents)
    .find({ incidentStatus: { $ne: "resolved" } }, { projection: { _id: 0, componentId: 1 } })
    .toArray();
  return Array.from(new Set(open.map((incident) => incident.componentId)));
}

export async function saveStatuses(db: Db, states: Map<string, ComponentState>): Promise<void> {
  if (states.size === 0) return;
  await db.collection(collections.infrastructureComponents).bulkWrite(
    Array.from(states, ([id, state]) => ({
      updateOne: { filter: { id }, update: { $set: { status: state.status } } },
    }))
  );
}
