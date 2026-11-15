import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";
import { loadInfrastructure } from "@/lib/infrastructureStore";
import { InfrastructureGraph } from "@/lib/simulation/graph";
import { simulateFailure } from "@/lib/simulation/failureEngine";
import { projectBackupDepletion } from "@/lib/simulation/backupDepletion";
import { calculateImpact } from "@/lib/simulation/impactCalculator";
import { districtPopulations } from "@/lib/seed/infrastructure";
import type { Incident, IncidentType } from "@/types/incident";
import type { RepairOperation } from "@/types/recovery";
import type { SimulationEvent } from "@/types/simulation";

const HISTORY_DAYS = 180;
const CAUSES: Record<string, string[]> = {
  electrical: ["Transformer overload", "Breaker trip cascade", "Storm damage to the feeder"],
  water: ["Main pipe rupture", "Pump station pressure loss", "Valve failure during maintenance"],
  comms: ["Fibre cut during road works", "Radio interference", "Exchange equipment fault"],
  transit: ["Bridge inspection closure", "Signal controller failure", "Severe weather disruption"],
  hospital: ["Backup power transfer fault", "Building systems outage", "Critical equipment failure"],
  emergency: ["Dispatch network interruption", "Station power fault", "Emergency radio equipment failure"],
};

function incidentTypeFor(category: string, componentId: string): IncidentType {
  if (category === "electrical") return "power_failure";
  if (category === "water") return componentId === "WA-01" ? "pipeline_rupture" : "water_main_break";
  if (category === "comms") return "communication_outage";
  if (category === "transit") return "transportation_disruption";
  return category === "hospital" ? "power_failure" : "natural_disaster";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { count?: number } | null;
  const count = body?.count ?? 10;
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    return NextResponse.json({ error: "Choose between 1 and 50 incidents." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const { components, dependencies } = await loadInfrastructure(db);
    const baselineComponents = components.map((component) => ({ ...component, status: "operational" as const }));
    const graph = new InfrastructureGraph(baselineComponents, dependencies);
    const now = Date.now();
    const incidents: Incident[] = [];
    const repairs: RepairOperation[] = [];
    const events: SimulationEvent[] = [];

    for (let index = 0; index < count; index += 1) {
      const origin = baselineComponents[Math.floor(Math.random() * baselineComponents.length)];
      const result = simulateFailure(graph, origin.id);
      const impact = calculateImpact(graph, origin.id, result.states, districtPopulations);
      const start = new Date(now - (2 + Math.floor(Math.random() * (HISTORY_DAYS - 1))) * 86_400_000);
      const hour = Math.random() < 0.45 ? 17 + Math.floor(Math.random() * 5) : Math.floor(Math.random() * 24);
      start.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
      const estimatedMinutes = impact.estimatedRecoveryMinutes;
      const durationMinutes = Math.max(20, Math.round(estimatedMinutes * (0.65 + Math.random() * 1.05)));
      const endedAt = new Date(start.getTime() + durationMinutes * 60_000);
      const incidentId = randomUUID();
      const incidentType = incidentTypeFor(origin.category, origin.id);
      const cause = CAUSES[origin.category]?.[Math.floor(Math.random() * (CAUSES[origin.category]?.length ?? 1))] ?? "Infrastructure equipment fault";
      const incident: Incident = {
        incidentId,
        componentId: origin.id,
        incidentType,
        severity: impact.severity,
        startTime: start.toISOString(),
        affectedComponents: result.affectedComponents,
        affectedZones: impact.affectedDistricts,
        estimatedImpact: impact,
        incidentStatus: "resolved",
        cause,
        durationMinutes,
        resolvedAt: endedAt.toISOString(),
      };
      incidents.push(incident);

      const crew = `${origin.district} ${origin.category} response crew`;
      repairs.push({
        repairId: randomUUID(), incidentId, componentId: origin.id, assignedCrew: crew,
        repairStatus: "restored", estimatedCompletion: new Date(start.getTime() + estimatedMinutes * 60_000).toISOString(),
        actualCompletion: endedAt.toISOString(), verificationStatus: "verified",
      });
      const addEvent = (event: Omit<SimulationEvent, "eventId" | "incidentId">) => events.push({ eventId: randomUUID(), incidentId, ...event });
      addEvent({ componentId: origin.id, eventType: "failure_triggered", timestamp: start.toISOString(), previousState: "operational", newState: "offline", simulationTimeMinutes: 0, detail: cause });
      for (const affected of result.affectedComponents) {
        const at = Math.max(1, affected.distanceFromOrigin) * 5;
        addEvent({ componentId: affected.componentId, eventType: "component_degraded", timestamp: new Date(start.getTime() + at * 60_000).toISOString(), previousState: affected.previousStatus, newState: affected.newStatus, simulationTimeMinutes: at });
        addEvent({ componentId: affected.componentId, eventType: "component_restored", timestamp: new Date(endedAt.getTime() + Math.max(1, affected.distanceFromOrigin) * 3 * 60_000).toISOString(), previousState: affected.newStatus, newState: "operational", simulationTimeMinutes: durationMinutes + Math.max(1, affected.distanceFromOrigin) * 3 });
      }
      const dispatchAt = start.getTime() + 12 * 60_000;
      addEvent({ componentId: origin.id, eventType: "repair_started", timestamp: new Date(dispatchAt).toISOString(), previousState: "offline", newState: "offline", simulationTimeMinutes: 12, detail: crew });
      addEvent({ componentId: origin.id, eventType: "repair_verified", timestamp: endedAt.toISOString(), previousState: "offline", newState: "operational", simulationTimeMinutes: durationMinutes });
      const backup = projectBackupDepletion(graph, [origin.id]);
      for (const transition of backup.transitions.filter((item) => item.simulationTimeMinutes <= durationMinutes)) {
        addEvent({
          componentId: transition.componentId, eventType: transition.reason,
          timestamp: new Date(start.getTime() + transition.simulationTimeMinutes * 60_000).toISOString(),
          previousState: transition.previousStatus, newState: transition.newStatus,
          simulationTimeMinutes: transition.simulationTimeMinutes,
          backupRemaining: Math.round(transition.backupRemaining * 10) / 10,
          detail: transition.reason === "backup_warning" ? "Backup reserve below 25%" : transition.reason === "backup_depleted" ? "Backup reserve exhausted" : "Network rebalanced",
        });
      }
    }

    await Promise.all([
      db.collection<Incident>(collections.incidents).insertMany(incidents),
      db.collection<RepairOperation>(collections.repairOperations).insertMany(repairs),
      db.collection<SimulationEvent>(collections.simulationEvents).insertMany(events),
    ]);
    return NextResponse.json({ count: incidents.length, incidents, message: `${incidents.length} simulated historical incidents added.` });
  } catch (error) {
    console.warn("Could not generate simulated incidents.", error);
    return NextResponse.json({ error: "Could not generate simulated incidents. Check the database connection and try again." }, { status: 503 });
  }
}
