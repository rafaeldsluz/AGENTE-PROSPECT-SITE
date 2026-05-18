import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config/index.js";
import { createModuleLogger } from "../utils/logger.js";
import * as schema from "./schema.js";

const log = createModuleLogger("database");

const pool = new Pool({
  connectionString: config.db.url,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  log.error({ error: String(err) }, "Erro inesperado no pool PostgreSQL");
});

export const db = drizzle(pool, { schema });

export async function checkConnection(): Promise<void> {
  const client = await pool.connect();
  client.release();
}

export async function closeConnection(): Promise<void> {
  await pool.end();
}
