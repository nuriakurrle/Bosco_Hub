// lib/inquiries.js — Queries on the `inquiries` table and translation of each
// database row into the "shape" the UI components expect (inherited from the
// design prototype).
//
// Core idea of the project: n8n reads the Outlook emails, extracts the data with
// the AI and INSERTs into `inquiries`. Here we read those same rows.
import { query } from "@/lib/db";

// ── Relative time in German, like in the prototype ("vor 12 Min.") ───────────
function relativeTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return "gestern";
  return `vor ${diffD} Tagen`;
}

function absoluteTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} · ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// The fields shown as the "extracted data" card. Order matters.
// `key` is the column in the database.
const FIELD_DEFS = [
  { id: "schule", key: "school_name", label: "Gruppe / Schule" },
  { id: "kontakt", key: "contact_person", label: "Kontakt" },
  { id: "art", key: "program_type", label: "Art / Programm" },
  { id: "haus", key: "house", label: "Haus" },
  { id: "termin", key: "date_range", label: "Zeitraum" },
  { id: "personen", key: "number_of_people", label: "Personen" },
  { id: "stufe", key: "grade_level", label: "Jahrgangsstufe" },
  { id: "sonder", key: "special_requirements", label: "Besonderes" },
];

// Converts a database row into the object the components consume
// (Inbox, Detail, SplitDetail).
export function rowToItem(row) {
  const missing = (row.missing_fields || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const fields = FIELD_DEFS.map((def) => {
    const value = row[def.key] || "";
    let status = "review"; // has a value but still needs confirming
    if (!value) status = "missing";
    else if (missing.includes(def.key) || missing.includes(def.label.toLowerCase()))
      status = "missing";
    return { id: def.id, key: def.key, label: def.label, value, status };
  });

  return {
    id: String(row.id),
    channel: row.channel || "email",
    from: row.contact_person || row.customer_email || "Unbekannt",
    customerEmail: row.customer_email || "",
    school: row.school_name || "— Schule unbekannt —",
    house: row.house || "",
    summary:
      row.summary ||
      row.original_subject ||
      [row.program_type, row.date_range].filter(Boolean).join(" · ") ||
      "Anfrage",
    subject: row.original_subject || "",
    received: relativeTime(row.received_at),
    receivedAbs: absoluteTime(row.received_at),
    // Wie lange liegt die Anfrage schon? (für die "nichts rutscht runter"-Logik
    // im Posteingang). Ganze Tage seit Eingang.
    waitingDays: row.received_at
      ? Math.floor((Date.now() - new Date(row.received_at).getTime()) / 86400000)
      : 0,
    receivedAtISO: row.received_at ? new Date(row.received_at).toISOString() : null,
    responsibleArea: row.responsible_area || "—",
    assignedTo: row.assigned_to || null,
    trackerStatus: row.tracker_status,
    containsSensitiveData: row.contains_sensitive_data || false,
    sensitiveDataNote: row.sensitive_data_note || "",
    conversationId: row.conversation_id || null,
    rawBody: row.raw_body || "",
    confirmationSentAt: row.confirmation_sent_at || null,
    missingFields: missing,
    fields,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────
export async function getInquiries() {
  const rows = await query(
    `SELECT * FROM inquiries ORDER BY received_at DESC, id DESC`
  );
  return rows.map(rowToItem);
}

export async function getInquiry(id) {
  const rows = await query(`SELECT * FROM inquiries WHERE id = $1`, [id]);
  return rows.length ? rowToItem(rows[0]) : null;
}

// All inquiries from the same email conversation (one email with several bookings
// is split into several rows sharing conversation_id).
export async function getConversation(conversationId) {
  const rows = await query(
    `SELECT * FROM inquiries WHERE conversation_id = $1 ORDER BY id ASC`,
    [conversationId]
  );
  return rows.map(rowToItem);
}

// ── Writes (the dashboard writes back to the same table) ─────────────────────
// Allow-list of columns the dashboard may update.
const UPDATABLE = new Set([
  "assigned_to",
  "tracker_status",
  "school_name",
  "contact_person",
  "program_type",
  "house",
  "date_range",
  "number_of_people",
  "grade_level",
  "special_requirements",
]);

export async function updateInquiry(id, patch) {
  const entries = Object.entries(patch).filter(([k]) => UPDATABLE.has(k));
  if (entries.length === 0) return getInquiry(id);

  const sets = entries.map(([k], i) => `${k} = $${i + 2}`);
  sets.push(`updated_at = NOW()`);
  const values = entries.map(([, v]) => v);

  const rows = await query(
    `UPDATE inquiries SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows.length ? rowToItem(rows[0]) : null;
}

// Creates a REAL booking in the `bookings` table from an inquiry, and marks the
// inquiry as 'booking_created'. Dates are parsed if they come as DD.MM.YYYY; if
// the AI gave them as free text, the text is stored and the dates stay empty
// (the staff fills them in later).
export async function createBookingFromInquiry(inquiryId, createdBy) {
  const rows = await query(`SELECT * FROM inquiries WHERE id = $1`, [inquiryId]);
  if (!rows.length) return null;
  const r = rows[0];

  // Backend validation: do not create a duplicate booking for the same inquiry.
  const existing = await query(
    `SELECT id FROM bookings WHERE inquiry_id = $1 LIMIT 1`,
    [inquiryId]
  );
  if (existing.length) {
    return { bookingId: existing[0].id, alreadyExisted: true };
  }

  // Dates: look for DD.MM.YYYY patterns (there may be 0, 1 or 2).
  const toISO = (m) => `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const dates = [...(r.date_range || "").matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)];
  const startDate = dates[0] ? toISO(dates[0]) : null;
  const endDate = dates[1] ? toISO(dates[1]) : startDate;

  // People: first integer found in the text.
  const peopleMatch = (r.number_of_people || "").match(/\d+/);
  const people = peopleMatch ? parseInt(peopleMatch[0], 10) : null;

  // House: look up the id by name.
  let houseId = null;
  if (r.house) {
    const h = await query(`SELECT id FROM houses WHERE name ILIKE $1 LIMIT 1`, [
      `%${r.house}%`,
    ]);
    houseId = h[0]?.id || null;
  }

  const ins = await query(
    `INSERT INTO bookings
       (inquiry_id, house_id, start_date, end_date, date_range_text,
        number_of_people, group_label, contact_person, program_type, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'reserved',$10)
     RETURNING id`,
    [
      inquiryId,
      houseId,
      startDate,
      endDate,
      r.date_range || null,
      people,
      r.grade_level || r.school_name || null,
      r.contact_person || null,
      r.program_type || null,
      createdBy || null,
    ]
  );

  await query(
    `UPDATE inquiries SET tracker_status = 'booking_created', updated_at = NOW() WHERE id = $1`,
    [inquiryId]
  );

  return { bookingId: ins[0]?.id };
}

// Marks that the customer confirmation has been sent (to avoid sending twice).
export async function markConfirmationSent(id) {
  await query(
    `UPDATE inquiries SET confirmation_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id]
  );
}
