import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";
import { InfrastructureGraph } from "@/lib/simulation/graph";
import { simulateFailure } from "@/lib/simulation/failureEngine";
import { calculateImpact } from "@/lib/simulation/impactCalculator";
import type {
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";
import type { Incident, IncidentType } from "@/types/incident";
import type { SimulationEvent } from "@/types/simulation";

interface SimulateRequestBody {
  componentId: string;
  incidentType: IncidentType;
}

/**
 * POST /api/simulate
 * Body: { componentId: string, incidentType: IncidentType }
 *
 * Triggers a failure at `componentId`, runs the deterministic failure
 * engine, persists the resulting Incident + SimulationEvents, and returns
 * the full result for the 3D scene and dashboard to render.
 *
 * Member 2 (Simulation): this is the integration point for your engine.
 * Member 4 (Backend): this is the integration point for persistence +
 * real-time broadcast (wire your WebSocket emit in here once ready).
 */
export async function POST(request: Request) {
  const body = (await request.json()) as SimulateRequestBody;

  if (!body.componentId || !body.incidentType) {
    return NextResponse.json(
      { error: "componentId and incidentType are required" },
      { status: 400 }
    );
  }

  const db = await getDb();

  const components = await db
    .collection<InfrastructureComponent>(collections.infrastructureComponents)
    .find({})
    .toArray();
  const dependencies = await db
    .collection<InfrastructureDependency>(collections.infrastructureDependencies)
    .find({})
    .toArray();

  const graph = new InfrastructureGraph(components, dependencies);
  const result = simulateFailure(graph, body.componentId);
  const impact = calculateImpact(graph, body.componentId, result.affectedComponents);

  const incident: Incident = {
    incidentId: randomUUID(),
    componentId: body.componentId,
    incidentType: body.incidentType,
    severity: impact.severity,
    startTime: new Date().toISOString(),
    affectedComponents: result.affectedComponents,
    affectedZones: impact.affectedDistricts,
    estimatedImpact: impact,
    incidentStatus: "active",
  };

  const events: SimulationEvent[] = [
    {
      eventId: randomUUID(),
      incidentId: incident.incidentId,
      componentId: body.componentId,
      eventType: "failure_triggered",
      timestamp: incident.startTime,
      previousState: "operational",
      newState: "failed",
      simulationTimeMinutes: 0,
    },
    ...result.affectedComponents.map((a, i) => ({
      eventId: randomUUID(),
      incidentId: incident.incidentId,
      componentId: a.componentId,
      eventType: "component_degraded" as const,
      timestamp: incident.startTime,
      previousState: a.previousStatus,
      newState: a.newStatus,
      simulationTimeMinutes: 5 + i * 2,
    })),
  ];

  await db.collection(collections.incidents).insertOne(incident);
  await db.collection(collections.simulationEvents).insertMany(events);

  // Persist the new statuses onto the components themselves so subsequent
  // GET /api/infrastructure calls reflect the incident.
  for (const [componentId, status] of result.finalStatuses) {
    await db
      .collection(collections.infrastructureComponents)
      .updateOne({ componentId }, { $set: { operationalStatus: status } });
  }

  return NextResponse.json({ incident, events });
}
