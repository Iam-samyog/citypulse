import { NextResponse } from "next/server";
import { getDb, collections } from "@/lib/mongodb";
import type {
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";

/**
 * GET /api/infrastructure
 * Returns every component and dependency so the client can build the
 * dependency graph and render the 3D city.
 */
export async function GET() {
  const db = await getDb();

  const components = await db
    .collection<InfrastructureComponent>(collections.infrastructureComponents)
    .find({})
    .toArray();

  const dependencies = await db
    .collection<InfrastructureDependency>(collections.infrastructureDependencies)
    .find({})
    .toArray();

  return NextResponse.json({ components, dependencies });
}
