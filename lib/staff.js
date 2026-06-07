// lib/staff.js — Team (previously hardcoded) read from the `staff` table,
// plus a helper to know "who am I" (current user) from a cookie.
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// Active team list.
export async function getStaff() {
  return query(
    `SELECT key, name, short, area FROM staff WHERE active = TRUE ORDER BY name ASC`
  );
}

// Current user: stored in the `zuk_me` cookie by the switcher in the top bar.
// If missing (or invalid), we fall back to the first person in the team.
export async function getCurrentUser(staff) {
  const store = await cookies();
  const key = store.get("zuk_me")?.value;
  if (key && staff.some((s) => s.key === key)) return key;
  return staff[0]?.key || null;
}
