import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";
import { reviewRecoveryPlan } from "@/lib/ai/grok";
import type { InfrastructureComponent } from "@/types/infrastructure";
import type { Incident } from "@/types/incident";
import type { RepairOperation } from "@/types/recovery";
import type { AIAnalysis } from "@/types/simulation";

interface GrokRequestBody {
  incidentId: string;
}

/**
 * POST /api/ai/grok
 * Body: { incidentId: string }
 *
 * The Strategic Oracle. Loads the incident and whatever repair operations
 * have been proposed so far, and asks Grok to independently critique the
 * plan. Persists the analysis alongside Gemini's for side-by-side display.
 *
 * Member 3 (AI Engineer): this is your integration point. GROK_API_KEY
 * must stay server-side — never call lib/ai/grok.ts from client code.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as GrokRequestBody;

  const db = await getDb();

  const incident = await db
    .collection<Incident>(collections.incidents)
    .findOne({ incidentId: body.incidentId });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const originComponent = await db
    .collection<InfrastructureComponent>(collections.infrastructureComponents)
    .findOne({ componentId: incident.componentId });

  const affectedComponents = await db
    .collection<InfrastructureComponent>(collections.infrastructureComponents)
    .find({
      componentId: { $in: incident.affectedComponents.map((a) => a.componentId) },
    })
    .toArray();

  const proposedRepairs = await db
    .collection<RepairOperation>(collections.repairOperations)
    .find({ incidentId: incident.incidentId })
    .toArray();

  if (!originComponent) {
    return NextResponse.json({ error: "Origin component not found" }, { status: 404 });
  }

  const result = await reviewRecoveryPlan({
    incident,
    originComponent,
    affectedComponents,
    proposedRepairs,
  });

  const analysis: AIAnalysis = {
    analysisId: randomUUID(),
    incidentId: incident.incidentId,
    provider: "grok",
    analysisType: "recovery_review",
    generatedSummary: result.summary,
    recommendations: result.recommendations,
    createdAt: new Date().toISOString(),
  };

  await db.collection(collections.aiAnalysis).insertOne(analysis);

  return NextResponse.json({ analysis });
}
