import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, collections } from "@/lib/mongodb";

const PLAN_ID = "demo-operator";
const BUILD_KINDS = new Set(["hospital", "school", "base"]);
const BUILD_COST: Record<string, number> = { hospital: 15, school: 8, base: 10 };

interface DevelopmentPlan {
  planId: string;
  buildings: { kind: "hospital" | "school" | "base"; plotIndex: number; name: string }[];
  stress: unknown[] | null;
  history?: { versionId: string; createdAt: string; buildings: DevelopmentPlan["buildings"]; stress: unknown[] | null }[];
  updatedAt: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const plan = await db.collection<DevelopmentPlan>(collections.developmentPlans).findOne(
      { planId: PLAN_ID },
      { projection: { _id: 0 } }
    );
    return NextResponse.json({ plan: plan ?? { planId: PLAN_ID, buildings: [], stress: null, history: [], updatedAt: null }, connected: true });
  } catch (error) {
    console.warn("Could not load the development plan.", error);
    return NextResponse.json({ error: "Could not connect to the database. Development changes are not saved." }, { status: 503 });
  }
}

/** Save an explicit, restorable snapshot of the current development plan. */
export async function POST() {
  try {
    const db = await getDb();
    const plans = db.collection<DevelopmentPlan>(collections.developmentPlans);
    const current = await plans.findOne({ planId: PLAN_ID }, { projection: { _id: 0, buildings: 1, stress: 1 } });
    const snapshot = {
      versionId: randomUUID(),
      createdAt: new Date().toISOString(),
      buildings: current?.buildings ?? [],
      stress: current?.stress ?? null,
    };
    await plans.updateOne(
      { planId: PLAN_ID },
      {
        $setOnInsert: { planId: PLAN_ID, buildings: [], stress: null, updatedAt: snapshot.createdAt },
        $push: { history: { $each: [snapshot], $slice: -20 } },
      },
      { upsert: true }
    );
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.warn("Could not save development history.", error);
    return NextResponse.json({ error: "Could not save the plan to history. Please try again." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null) as Partial<DevelopmentPlan> | null;
  if (!body || !Array.isArray(body.buildings) || body.buildings.length > 24) {
    return NextResponse.json({ error: "A development plan can contain up to 24 buildings." }, { status: 400 });
  }
  const buildings: DevelopmentPlan["buildings"] = [];
  const usedPlots = new Set<number>();
  let totalCost = 0;
  for (const building of body.buildings) {
    if (!building || !BUILD_KINDS.has(building.kind) || !Number.isInteger(building.plotIndex) || building.plotIndex < 0 || building.plotIndex >= 24 || usedPlots.has(building.plotIndex) || typeof building.name !== "string" || !/^[\p{L}\p{N} '’.,-]{1,100}$/u.test(building.name)) {
      return NextResponse.json({ error: "The development plan contains an invalid building or plot." }, { status: 400 });
    }
    usedPlots.add(building.plotIndex);
    totalCost += BUILD_COST[building.kind];
    if (totalCost > 120) return NextResponse.json({ error: "The plan exceeds the 120 talent treasury." }, { status: 400 });
    buildings.push({ kind: building.kind, plotIndex: building.plotIndex, name: building.name });
  }
  if (body.stress !== null && body.stress !== undefined && (!Array.isArray(body.stress) || body.stress.length > 8)) {
    return NextResponse.json({ error: "Stress-test results are invalid." }, { status: 400 });
  }

  const plan: DevelopmentPlan = {
    planId: PLAN_ID,
    buildings,
    stress: body.stress ?? null,
    updatedAt: new Date().toISOString(),
  };
  try {
    const db = await getDb();
    await db.collection<DevelopmentPlan>(collections.developmentPlans).updateOne(
      { planId: PLAN_ID },
      { $set: plan },
      { upsert: true }
    );
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    console.warn("Could not save the development plan.", error);
    return NextResponse.json({ error: "Could not save to the database. Please try again." }, { status: 503 });
  }
}
