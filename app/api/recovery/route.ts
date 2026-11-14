import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";
import { InfrastructureGraph } from "@/lib/simulation/graph";
import { applyRepair } from "@/lib/simulation/recoveryEngine";
import type {
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";
import type { RepairOperation, RepairStage } from "@/types/recovery";

interface RecoveryRequestBody {
  incidentId: string;
  componentId: string;
  assignedCrew: string;
  repairStatus: RepairStage;
  estimatedCompletion: string;
  verificationStatus?: "pending" | "verified" | "failed_verification";
  repairId?: string; // pass to update an existing repair instead of creating one
}

/**
 * POST /api/recovery
 * Creates or advances a repair operation. When repairStatus is "restored"
 * and verificationStatus is "verified", re-runs the recovery engine and
 * persists the resulting component states (cascading restoration).
 *
 * Member 2 (Simulation) / Member 4 (Backend): integration point for the
 * Chapter V "Return to Ithaca" workflow.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as RecoveryRequestBody;

  const db = await getDb();

  const repair: RepairOperation = {
    repairId: body.repairId ?? randomUUID(),
    incidentId: body.incidentId,
    componentId: body.componentId,
    assignedCrew: body.assignedCrew,
    repairStatus: body.repairStatus,
    estimatedCompletion: body.estimatedCompletion,
    verificationStatus: body.verificationStatus ?? "pending",
    ...(body.repairStatus === "restored" ? { actualCompletion: new Date().toISOString() } : {}),
  };

  await db
    .collection(collections.repairOperations)
    .updateOne({ repairId: repair.repairId }, { $set: repair }, { upsert: true });

  const components = await db
    .collection<InfrastructureComponent>(collections.infrastructureComponents)
    .find({})
    .toArray();
  const dependencies = await db
    .collection<InfrastructureDependency>(collections.infrastructureDependencies)
    .find({})
    .toArray();

  const graph = new InfrastructureGraph(components, dependencies);
  const updatedStatuses = applyRepair(graph, repair);

  for (const [componentId, status] of updatedStatuses) {
    await db
      .collection(collections.infrastructureComponents)
      .updateOne({ componentId }, { $set: { operationalStatus: status } });
  }

  return NextResponse.json({ repair, updatedStatuses: Array.from(updatedStatuses.entries()) });
}
