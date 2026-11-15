import { NextResponse } from "next/server";
import { getDb, collections } from "@/lib/mongodb";
import type { Incident } from "@/types/incident";

/**
 * GET /api/incidents            -> list all incidents (most recent first)
 * GET /api/incidents?id=<uuid>  -> a single incident
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    const db = await getDb();
    const collection = db.collection<Incident>(collections.incidents);

    if (id) {
      const incident = await collection.findOne({ incidentId: id });
      if (!incident) {
        return NextResponse.json({ error: "Incident not found" }, { status: 404 });
      }
      return NextResponse.json({ incident, source: "mongodb" });
    }

    const incidents = await collection.find({}).sort({ startTime: -1 }).toArray();
    return NextResponse.json({ incidents, source: "mongodb" });
  } catch (error) {
    console.warn("MongoDB unavailable; serving an empty incident fixture.", error);

    if (id) {
      return NextResponse.json(
        { error: "Incident data is temporarily unavailable", source: "fixture" },
        { status: 503 }
      );
    }

    return NextResponse.json({ incidents: [], source: "fixture" });
  }
}
