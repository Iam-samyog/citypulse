import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { loadInfrastructure } from "@/lib/infrastructureStore";
import {
  districts,
  infrastructureComponents,
  infrastructureDependencies,
} from "@/lib/seed/infrastructure";

/**
 * GET /api/infrastructure
 * Every component and dependency, plus the district table, so the client
 * can build the dependency graph and render the 3D city.
 */
export async function GET() {
  try {
    const db = await getDb();
    const { components, dependencies } = await loadInfrastructure(db);
    return NextResponse.json({ components, dependencies, districts, source: "mongodb" });
  } catch (error) {
    console.warn("MongoDB unavailable; serving the deterministic city fixture.", error);
    return NextResponse.json({
      components: infrastructureComponents,
      dependencies: infrastructureDependencies,
      districts,
      source: "fixture",
    });
  }
}
