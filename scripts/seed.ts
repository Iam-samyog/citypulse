/**
 * Upserts the simulated city of Ithaca into MongoDB.
 *
 *   npm run seed             upsert components and dependencies by id, and
 *                            remove any that are no longer in the seed
 *   npm run seed -- --reset  also clear incidents, repairs, events and AI
 *                            analysis, returning the city to a clean state
 *
 * Safe to run repeatedly. Component statuses are set back to the seed
 * values, so use --reset alongside it if incidents are still open.
 */
import { getDb, collections } from "@/lib/mongodb";
import {
  infrastructureComponents,
  infrastructureDependencies,
} from "@/lib/seed/infrastructure";
import { InfrastructureGraph } from "@/lib/simulation/graph";

async function upsertById<T extends { id: string }>(
  db: Awaited<ReturnType<typeof getDb>>,
  collectionName: string,
  documents: T[]
) {
  const collection = db.collection(collectionName);
  await collection.createIndex({ id: 1 }, { unique: true, sparse: true });
  const stale = await collection.deleteMany({ id: { $nin: documents.map((d) => d.id) } });
  const result = await collection.bulkWrite(
    documents.map((document) => ({
      replaceOne: { filter: { id: document.id }, replacement: document, upsert: true },
    }))
  );
  return {
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    unchanged: documents.length - result.upsertedCount - result.modifiedCount,
    removed: stale.deletedCount,
  };
}

async function main() {
  const validation = new InfrastructureGraph(
    infrastructureComponents,
    infrastructureDependencies
  ).validateGraph();
  for (const warning of validation.warnings) console.warn(`warning: ${warning}`);
  if (!validation.valid) {
    for (const error of validation.errors) console.error(`error: ${error}`);
    throw new Error("Seed graph is invalid; nothing was written.");
  }

  const db = await getDb();

  const components = await upsertById(db, collections.infrastructureComponents, infrastructureComponents);
  const dependencies = await upsertById(db, collections.infrastructureDependencies, infrastructureDependencies);
  console.log(`${collections.infrastructureComponents}:`, components);
  console.log(`${collections.infrastructureDependencies}:`, dependencies);

  if (process.argv.includes("--reset")) {
    for (const name of [
      collections.incidents,
      collections.repairOperations,
      collections.simulationEvents,
      collections.aiAnalysis,
    ]) {
      const { deletedCount } = await db.collection(name).deleteMany({});
      console.log(`${name}: cleared ${deletedCount}`);
    }
  }

  for (const name of [collections.repairOperations, collections.simulationEvents, collections.aiAnalysis]) {
    await db.collection(name).createIndex({ incidentId: 1 });
  }
  await db.collection(collections.incidents).createIndex({ incidentId: 1 }, { unique: true });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
