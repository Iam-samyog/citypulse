import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  }
  return new MongoClient(uri, {
    serverSelectionTimeoutMS: 4_000,
    connectTimeoutMS: 4_000,
  }).connect();
}

function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise().catch((error) => {
      // A failed connection should not poison a warm serverless process forever.
      global._mongoClientPromise = undefined;
      throw error;
    });
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB ?? "citypulse");
}

export const collections = {
  infrastructureComponents: "infrastructure_components",
  infrastructureDependencies: "infrastructure_dependencies",
  incidents: "incidents",
  repairOperations: "repair_operations",
  simulationEvents: "simulation_events",
  aiAnalysis: "ai_analysis",
  simulatorHistory: "simulator_history",
  developmentPlans: "development_plans",
} as const;
