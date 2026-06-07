// lib/inquiries.js — Consultas a la tabla `inquiries` y traducción de cada fila
// de la base de datos a la "forma" que entienden los componentes de la UI
// (heredada del prototipo de diseño).
//
// La idea central del proyecto: n8n lee los emails de Outlook, extrae los datos
// con la IA y hace INSERT en `inquiries`. Aquí leemos esas mismas filas.
import { query } from "@/lib/db";

// ── Tiempo relativo en alemán, como en el prototipo ("vor 12 Min.") ──────────
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

// Los campos que mostramos como tarjeta de "datos extraídos". El orden importa.
// `key` es la columna en la base de datos.
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

// Convierte una fila de la base de datos en el objeto que consumen los
// componentes (Inbox, Detail, SplitDetail).
export function rowToItem(row) {
  const missing = (row.missing_fields || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const fields = FIELD_DEFS.map((def) => {
    const value = row[def.key] || "";
    let status = "review"; // hay valor pero falta confirmarlo
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

// ── Lecturas ─────────────────────────────────────────────────────────────────
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

// Todas las inquiries de una misma conversación de email (una email con varias
// reservas se parte en varias filas que comparten conversation_id).
export async function getConversation(conversationId) {
  const rows = await query(
    `SELECT * FROM inquiries WHERE conversation_id = $1 ORDER BY id ASC`,
    [conversationId]
  );
  return rows.map(rowToItem);
}

// ── Escrituras (el dashboard escribe de vuelta a la misma tabla) ─────────────
// Lista blanca de columnas que el dashboard puede actualizar.
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

// Crea una reserva REAL en la tabla `bookings` a partir de una inquiry, y marca
// la inquiry como 'booking_created'. Las fechas se parsean si vienen como
// DD.MM.YYYY; si la IA las dio en texto libre, se guarda el texto y las fechas
// quedan vacías (el staff las completa después).
export async function createBookingFromInquiry(inquiryId, createdBy) {
  const rows = await query(`SELECT * FROM inquiries WHERE id = $1`, [inquiryId]);
  if (!rows.length) return null;
  const r = rows[0];

  // Validación backend: no crear una reserva duplicada para la misma inquiry.
  const existing = await query(
    `SELECT id FROM bookings WHERE inquiry_id = $1 LIMIT 1`,
    [inquiryId]
  );
  if (existing.length) {
    return { bookingId: existing[0].id, alreadyExisted: true };
  }

  // Fechas: busca patrones DD.MM.YYYY (puede haber 0, 1 o 2).
  const toISO = (m) => `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const dates = [...(r.date_range || "").matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)];
  const startDate = dates[0] ? toISO(dates[0]) : null;
  const endDate = dates[1] ? toISO(dates[1]) : startDate;

  // Personas: primer número entero del texto.
  const peopleMatch = (r.number_of_people || "").match(/\d+/);
  const people = peopleMatch ? parseInt(peopleMatch[0], 10) : null;

  // Casa: busca el id por nombre.
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

// Marca que ya se envió la confirmación al cliente (para no mandarla dos veces).
export async function markConfirmationSent(id) {
  await query(
    `UPDATE inquiries SET confirmation_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id]
  );
}
