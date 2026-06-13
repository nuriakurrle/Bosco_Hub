// lib/history.js — Stammkunden-/Schul-Kontext.
// Interview (ZUK): bei bekannten Schulen weiß das Team schon viel ("I already
// know this school", Frau-Baggi-Fall). Hier holen wir frühere Buchungen und
// Anfragen derselben Schule, damit man Wiederkehrer sofort erkennt.
import { query } from "@/lib/db";

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()}`;
}

export async function getSchoolHistory(schoolName, excludeInquiryId) {
  if (!schoolName || schoolName.startsWith("—")) return null;
  // Markante ersten zwei Wörter als unscharfer Filter (z. B. "Realschule Bruckmühl").
  const needle = `%${schoolName.split(/\s+/).slice(0, 2).join(" ")}%`;
  const exclude = excludeInquiryId ? Number(excludeInquiryId) : null;

  const bookings = await query(
    `SELECT b.id, b.start_date, b.end_date, b.date_range_text, b.number_of_people,
            b.program_type, b.status, b.created_at
       FROM bookings b
       LEFT JOIN inquiries i ON i.id = b.inquiry_id
      WHERE i.school_name ILIKE $1
        AND ($2::int IS NULL OR b.inquiry_id IS DISTINCT FROM $2)
      ORDER BY b.created_at DESC
      LIMIT 5`,
    [needle, exclude]
  );

  // Frühere Anfragen derselben Schule (andere Vorgänge) — Zähler für "Wiederkehrer".
  const [{ n: priorInquiries }] = await query(
    `SELECT count(*)::int AS n FROM inquiries
      WHERE school_name ILIKE $1 AND ($2::int IS NULL OR id <> $2)`,
    [needle, exclude]
  );

  const list = bookings.map((b) => ({
    id: String(b.id),
    dates:
      b.start_date && b.end_date
        ? `${fmtDate(b.start_date)} – ${fmtDate(b.end_date)}`
        : b.date_range_text || "—",
    program: b.program_type || "—",
    people: b.number_of_people != null ? String(b.number_of_people) : "—",
    status: b.status || "reserved",
  }));

  if (list.length === 0 && priorInquiries === 0) return null;
  return {
    isReturning: list.length > 0 || priorInquiries > 0,
    bookingsCount: list.length,
    priorInquiries,
    bookings: list,
  };
}
