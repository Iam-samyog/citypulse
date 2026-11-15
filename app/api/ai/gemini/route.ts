import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";
import { explainIncident } from "@/lib/ai/gemini";
import type { InfrastructureComponent } from "@/types/infrastructure";
import type { Incident } from "@/types/incident";
import type { AIAnalysis } from "@/types/simulation";

interface GeminiRequestBody {
  incidentId: string;
  question?: string;
}

/**
 * POST /api/ai/gemini
 * Body: { incidentId: string, question?: string }
 *
 * Athena's Intelligence. Loads the incident + affected components from
 * MongoDB, asks Gemini to explain it (grounded in that data only), and
 * persists the analysis so it shows up in incident history.
 *
 * Member 3 (AI Engineer): this is your integration point. GEMINI_API_KEY
 * must stay server-side — never call lib/ai/gemini.ts from client code.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as GeminiRequestBody;

  const db = await getDb();

  const incident = await db
    .collection<Incident>(collections.incidents)
    .findOne({ incidentId: body.incidentId });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const originComponent = await db
    .collection<InfrastructureComponent>(collections.infrastructureComponents)
    .findOne({ id: incident.componentId });

  const affectedComponents = await db
    .collection<InfrastructureComponent>(collections.infrastructureComponents)
    .find({
      id: { $in: incident.affectedComponents.map((a) => a.componentId) },
    })
    .toArray();

  if (!originComponent) {
    return NextResponse.json({ error: "Origin component not found" }, { status: 404 });
  }

  let result;
  try {
    result = await explainIncident({
      incident,
      originComponent,
      affectedComponents,
      question: body.question,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini is unavailable";
    return NextResponse.json(
      {
        error: message.includes("GEMINI_API_KEY")
          ? "Gemini is not connected. Add GEMINI_API_KEY to .env.local and restart the server."
          : `Gemini could not analyze this incident: ${message}`,
      },
      { status: 503 }
    );
  }

  const analysis: AIAnalysis = {
    analysisId: randomUUID(),
    incidentId: incident.incidentId,
    provider: "gemini",
    analysisType: body.question ? "qa_response" : "incident_explanation",
    generatedSummary: result.summary,
    recommendations: result.recommendations,
    createdAt: new Date().toISOString(),
  };

  await db.collection(collections.aiAnalysis).insertOne(analysis);

  return NextResponse.json({ analysis });
}
