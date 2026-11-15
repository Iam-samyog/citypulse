import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";
import { loadFailedComponentIds, loadGraph, saveStatuses } from "@/lib/infrastructureStore";
import { districtPopulations } from "@/lib/seed/infrastructure";
import { simulateFailure } from "@/lib/simulation/failureEngine";
import { projectBackupDepletion } from "@/lib/simulation/backupDepletion";
import { calculateImpact } from "@/lib/simulation/impactCalculator";
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
 * Fails `componentId` on top of any incidents still open, runs the
 * deterministic cascade, persists the Incident and its SimulationEvents,
 * and writes the new status of every component.
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
  const graph = await loadGraph(db);
  const origin = graph.getComponent(body.componentId);
  if (!origin) {
    return NextResponse.json({ error: `Unknown component: ${body.componentId}` }, { status: 404 });
  }

  const alreadyFailed = await loadFailedComponentIds(db);
  if (alreadyFailed.includes(origin.id)) {
    return NextResponse.json(
      { error: `${origin.name} already has an open incident` },
      { status: 409 }
    );
  }

  const result = simulateFailure(graph, origin.id, alreadyFailed);
  const failedIds = [...alreadyFailed, origin.id];
  const backupProjection = projectBackupDepletion(graph, failedIds);
  const impact = calculateImpact(graph, origin.id, result.states, districtPopulations);
  const startTime = new Date().toISOString();

  const incident: Incident = {
    incidentId: randomUUID(),
    componentId: origin.id,
    incidentType: body.incidentType,
    severity: impact.severity,
    startTime,
    affectedComponents: result.affectedComponents,
    affectedZones: impact.affectedDistricts,
    estimatedImpact: impact,
    incidentStatus: "active",
  };

  const events: SimulationEvent[] = [
    {
      eventId: randomUUID(),
      incidentId: incident.incidentId,
      componentId: origin.id,
      eventType: "failure_triggered",
      timestamp: startTime,
      previousState: origin.status,
      newState: "offline",
      simulationTimeMinutes: 0,
    },
    ...result.affectedComponents.map((affected) => ({
      eventId: randomUUID(),
      incidentId: incident.incidentId,
      componentId: affected.componentId,
      eventType: "component_degraded" as const,
      timestamp: startTime,
      previousState: affected.previousStatus,
      newState: affected.newStatus,
      // Effects arrive in waves: five minutes per hop from the origin.
      simulationTimeMinutes: Math.max(1, affected.distanceFromOrigin) * 5,
    })),
    ...backupProjection.transitions.map((transition) => ({
      eventId: randomUUID(),
      incidentId: incident.incidentId,
      componentId: transition.componentId,
      eventType: transition.reason,
      timestamp: new Date(
        new Date(startTime).getTime() + transition.simulationTimeMinutes * 60_000
      ).toISOString(),
      previousState: transition.previousStatus,
      newState: transition.newStatus,
      simulationTimeMinutes: transition.simulationTimeMinutes,
      backupRemaining: Math.round(transition.backupRemaining * 10) / 10,
      detail:
        transition.reason === "backup_warning"
          ? "Backup reserve below 25%"
          : transition.reason === "backup_depleted"
            ? `Backup exhausted; service changed from ${Math.round(transition.previousServiceLevel * 100)}% to ${Math.round(transition.newServiceLevel * 100)}%`
            : `Network rebalanced; service changed from ${Math.round(transition.previousServiceLevel * 100)}% to ${Math.round(transition.newServiceLevel * 100)}%`,
    })),
  ];

  events.sort(
    (a, b) =>
      a.simulationTimeMinutes - b.simulationTimeMinutes ||
      a.componentId.localeCompare(b.componentId)
  );

  await db.collection(collections.incidents).insertOne({ ...incident });
  await db.collection(collections.simulationEvents).insertMany(events.map((event) => ({ ...event })));
  await saveStatuses(db, result.states);

  return NextResponse.json({
    incident,
    events,
    backupProjection: {
      horizonMinutes: backupProjection.horizonMinutes,
      stepMinutes: backupProjection.stepMinutes,
      endurance: backupProjection.endurance,
      transitionCount: backupProjection.transitions.length,
    },
  });
}
