import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { consultOracle } from "@/lib/ai/gemini";
import { collections, getDb } from "@/lib/mongodb";
import type { Incident } from "@/types/incident";
import type { InfrastructureComponent } from "@/types/infrastructure";
import type { RepairOperation } from "@/types/recovery";
import type { AIAnalysis } from "@/types/simulation";

interface OracleRequestBody {
  incidentId: string;
  question?: string;
}

/** Oracle persona, powered by the same Gemini model and key as Athena. */
export async function POST(request: Request) {
  const body = (await request.json()) as OracleRequestBody;
  if (!body.incidentId) {
    return NextResponse.json({ error: "incidentId is required" }, { status: 400 });
  }

  const db = await getDb();
  const incident = await db
    .collection<Incident>(collections.incidents)
    .findOne({ incidentId: body.incidentId });
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  const [originComponent, affectedComponents, proposedRepairs] = await Promise.all([
    db.collection<InfrastructureComponent>(collections.infrastructureComponents).findOne({ id: incident.componentId }),
    db.collection<InfrastructureComponent>(collections.infrastructureComponents).find({ id: { $in: incident.affectedComponents.map((item) => item.componentId) } }).toArray(),
    db.collection<RepairOperation>(collections.repairOperations).find({ incidentId: incident.incidentId }).toArray(),
  ]);

  if (!originComponent) {
    return NextResponse.json({ error: "Origin component not found" }, { status: 404 });
  }

  let result;
  try {
    result = await consultOracle({
      incident,
      originComponent,
      affectedComponents,
      proposedRepairs,
      question: body.question,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Oracle is unavailable";
    return NextResponse.json(
      {
        error: message.includes("GEMINI_API_KEY")
          ? "Oracle is not connected. Add GEMINI_API_KEY to .env.local and restart the server."
          : `Oracle could not analyze this incident: ${message}`,
      },
      { status: 503 }
    );
  }

  const analysis: AIAnalysis = {
    analysisId: randomUUID(),
    incidentId: incident.incidentId,
    provider: "gemini",
    analysisType: body.question ? "qa_response" : "recovery_review",
    generatedSummary: result.summary,
    recommendations: result.recommendations,
    createdAt: new Date().toISOString(),
  };

  await db.collection(collections.aiAnalysis).insertOne({ ...analysis, agent: "oracle" });
  return NextResponse.json({ analysis });
}
