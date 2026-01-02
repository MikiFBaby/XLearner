import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import ws from "ws";

// Configure WebSocket for local development
neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  pool: Pool | undefined;
};

function createDb() {
  const connectionString = process.env.DATABASE_URL!;
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export default db;
