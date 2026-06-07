// lib/db.js — Conexión única (pool) a la Postgres que comparte n8n.
// n8n ESCRIBE las inquiries aquí; el dashboard las LEE de la misma tabla.
//
// En Next.js el módulo se recarga en desarrollo, así que guardamos el pool
// en globalThis para no abrir conexiones nuevas en cada hot-reload.
import { Pool } from "pg";

const globalForPg = globalThis;

export const pool =
  globalForPg._zukPgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // El docker es local; sin SSL.
    ssl: false,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg._zukPgPool = pool;
}

// Helper corto para queries. Devuelve directamente las filas.
export async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}
