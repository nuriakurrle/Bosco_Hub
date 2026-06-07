// lib/db.js — Single connection pool to the Postgres shared with n8n.
// n8n WRITES the inquiries here; the dashboard READS them from the same table.
//
// In Next.js the module reloads in development, so we cache the pool on
// globalThis to avoid opening new connections on every hot-reload.
import { Pool } from "pg";

const globalForPg = globalThis;

export const pool =
  globalForPg._zukPgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // The docker is local; no SSL.
    ssl: false,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg._zukPgPool = pool;
}

// Short query helper. Returns the rows directly.
export async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}
