import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";
import { loadFailedComponentIds, loadGraph, saveStatuses } from "@/lib/infrastructureStore";
import { applyRepair, isRepairComplete } from "@/lib/simulation/recoveryEngine";
import type { Incident } from "@/types/incident";
import type { RepairOperation, RepairStage, VerificationStatus } from "@/types/recovery";

/** GET /api/recovery?incidentId=... returns the repair history for one incident. */
export async function GET(request: Request) {
  const incidentId = new URL(request.url).searchParams.get("incidentId");
  if (!incidentId) {
    return NextResponse.json({ error: "incidentId is required" }, { status: 400 });
  }

  const db = await getDb();
  const repairs = await db
    .collection<RepairOperation>(collections.repairOperations)
    .find({ incidentId }, { projection: { _id: 0 } })
    .sort({ actualCompletion: -1, estimatedCompletion: -1 })
    .toArray();
  return NextResponse.json({ repairs });
}

interface RecoveryRequestBody {
  incidentId: string;
  componentId: string;
  assignedCrew: string;
  repairStatus: RepairStage;
  estimatedCompletion: string;
  verificationStatus?: VerificationStatus;
  /** Pass to advance an existing repair instead of creating one. */
  repairId?: string;
}

/**
 * POST /api/recovery
 * Creates or advances a repair operation. Only the component that failed
 * at source needs repairing: once its repair is restored and verified the
 * incident closes and everything downstream is recalculated from its own
 * supply. Repairs logged against downstream components are tracked but do
 * not change the network.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as RecoveryRequestBody;
  if (!body.incidentId || !body.componentId || !body.repairStatus) {
    return NextResponse.json(
      { error: "incidentId, componentId and repairStatus are required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const incidents = db.collection<Incident>(collections.incidents);
  const incident = await incidents.findOne({ incidentId: body.incidentId });
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const graph = await loadGraph(db);
  if (!graph.getComponent(body.componentId)) {
    return NextResponse.json({ error: `Unknown component: ${body.componentId}` }, { status: 404 });
  }

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
    .updateOne(
      { repairId: repair.repairId },
      {
        $set: repair,
        ...(body.repairStatus === "restored" ? {} : { $unset: { actualCompletion: "" } }),
      },
      { upsert: true }
    );

  const closesIncident = isRepairComplete(repair) && repair.componentId === incident.componentId;
  if (closesIncident) {
    await incidents.updateOne({ incidentId: incident.incidentId }, { $set: { incidentStatus: "resolved" } });
  } else if (incident.incidentStatus === "active") {
    await incidents.updateOne({ incidentId: incident.incidentId }, { $set: { incidentStatus: "recovering" } });
  }

  const states = applyRepair(graph, repair, await loadFailedComponentIds(db));
  await saveStatuses(db, states);

  return NextResponse.json({
    repair,
    incidentResolved: closesIncident,
    statuses: Array.from(states, ([componentId, state]) => ({ componentId, ...state })),
  });
}
