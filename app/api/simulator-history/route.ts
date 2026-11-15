import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";

interface SimulatorHistoryBody {
  scenario: string;
  scenarioTitle: string;
  options?: { o1?: string; o1Label?: string; o2?: string; o2Label?: string };
  outcome: "good" | "bad" | string;
  outcomeText: string;
  durationSimMinutes: number;
  severity: number;
  maxSeverity: number;
  kpis?: { label: string; value: string | number }[];
  curve?: { t: number; sev: number }[];
  events?: { t: number; text: string; kind: string }[];
  startedAt?: string;
  endedAt?: string;
}

/**
 * GET /api/simulator-history?limit=30
 * Lists saved 3D-simulator runs, most recent first, plus a `connected`
 * flag so the client can show a live database-status badge.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 30) || 30, 100);

  try {
    const db = await getDb();
    const items = await db
      .collection(collections.simulatorHistory)
      .find({})
      .sort({ endedAt: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json({ items, connected: true });
  } catch (error) {
    console.warn("MongoDB unavailable for simulator history.", error);
    return NextResponse.json({ items: [], connected: false });
  }
}

/**
 * POST /api/simulator-history
 * Saves one finished run of the standalone 3D crisis simulator.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as SimulatorHistoryBody;
  if (!body.scenario || !body.outcomeText) {
    return NextResponse.json({ error: "scenario and outcomeText are required" }, { status: 400 });
  }

  const record = {
    runId: randomUUID(),
    scenario: body.scenario,
    scenarioTitle: body.scenarioTitle,
    options: body.options ?? {},
    outcome: body.outcome,
    outcomeText: body.outcomeText,
    durationSimMinutes: body.durationSimMinutes,
    severity: body.severity,
    maxSeverity: body.maxSeverity,
    kpis: body.kpis ?? [],
    curve: (body.curve ?? []).slice(-200),
    events: (body.events ?? []).slice(-80),
    startedAt: body.startedAt ?? null,
    endedAt: body.endedAt ?? new Date().toISOString(),
    source: "3d-simulator",
  };

  try {
    const db = await getDb();
    await db.collection(collections.simulatorHistory).insertOne(record);
    return NextResponse.json({ ok: true, runId: record.runId });
  } catch (error) {
    console.warn("MongoDB unavailable; simulator run was not saved.", error);
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 });
  }
}
