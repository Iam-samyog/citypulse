/**
 * Loads the fixture city into MongoDB Atlas.
 * Run with: npm run seed
 */
import { getDb, collections } from "@/lib/mongodb";
import {
  infrastructureComponents,
  infrastructureDependencies,
} from "@/lib/seed/infrastructure";

async function main() {
  const db = await getDb();

  await db.collection(collections.infrastructureComponents).deleteMany({});
  await db.collection(collections.infrastructureDependencies).deleteMany({});
  await db.collection(collections.incidents).deleteMany({});
  await db.collection(collections.repairOperations).deleteMany({});
  await db.collection(collections.simulationEvents).deleteMany({});
  await db.collection(collections.aiAnalysis).deleteMany({});

  await db
    .collection(collections.infrastructureComponents)
    .insertMany(infrastructureComponents);
  await db
    .collection(collections.infrastructureDependencies)
    .insertMany(infrastructureDependencies);

  console.log(
    `Seeded ${infrastructureComponents.length} components and ${infrastructureDependencies.length} dependencies.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
