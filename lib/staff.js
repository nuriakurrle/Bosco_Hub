// lib/staff.js — Equipo (antes hardcodeado) leído desde la tabla `staff`,
// y helper para saber "quién soy" (usuario actual) desde una cookie.
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// Lista del equipo activo.
export async function getStaff() {
  return query(
    `SELECT key, name, short, area FROM staff WHERE active = TRUE ORDER BY name ASC`
  );
}

// Usuario actual: se guarda en la cookie `zuk_me` desde el selector de la barra
// superior. Si no hay (o es inválida), usamos la primera persona del equipo.
export async function getCurrentUser(staff) {
  const store = await cookies();
  const key = store.get("zuk_me")?.value;
  if (key && staff.some((s) => s.key === key)) return key;
  return staff[0]?.key || null;
}
