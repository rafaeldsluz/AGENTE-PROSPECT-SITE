import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config/index.js";
import * as schema from "./schema.js";

const pool = new Pool({
  connectionString: config.db.url,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool PostgreSQL:", err);
});

export const db = drizzle(pool, { schema });

export async function checkConnection(): Promise<void> {
  const client = await pool.connect();
  client.release();
}

export async function closeConnection(): Promise<void> {
  await pool.end();
}
