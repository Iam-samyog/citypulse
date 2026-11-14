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
  return new MongoClient(uri).connect();
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClientPromise();
    }
    return global._mongoClientPromise;
  }
  return createClientPromise();
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
} as const;
