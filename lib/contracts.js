// lib/contracts.js — Verträge-Übersicht: Buchungen nach Vertrags-Status, mit
// Frist relativ zum Aufenthaltsbeginn. Interview: der Vertrag geht ~2 Wochen
// vor Anreise raus — hier als Frist-Ampel sichtbar gemacht.
import { query } from "@/lib/db";
import { isoDate } from "@/lib/datefmt";
import { deadlineFor } from "@/lib/deadline";

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()}`;
}

const STATUS_LABEL = { draft: "Entwurf nötig", sent: "Versendet", signed: "Bestätigt" };

export async function getContractsOverview() {
  const rows = await query(
    `SELECT b.id, b.start_date, b.end_date, b.date_range_text, b.number_of_people,
            b.group_label, b.contact_person, b.program_type, b.status,
            b.contract_status, b.contract_sent_at, b.created_by, b.inquiry_id,
            b.house_id, b.contract_text,
            h.name AS house_name, i.school_name, i.customer_email
       FROM bookings b
       LEFT JOIN houses h    ON h.id = b.house_id
       LEFT JOIN inquiries i ON i.id = b.inquiry_id
      ORDER BY b.start_date NULLS LAST, b.id DESC`
  );

  const items = rows.map((r) => {
    const cs = r.contract_status || "draft";
    let dates;
    if (r.start_date && r.end_date) dates = `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`;
    else if (r.start_date) dates = fmtDate(r.start_date);
    else dates = r.date_range_text || "—";
    return {
      id: String(r.id),
      inquiryId: r.inquiry_id ? String(r.inquiry_id) : null,
      title: r.group_label || r.school_name || "Buchung",
      school: r.school_name || "",
      contact: r.contact_person || "",
      email: r.customer_email || "",
      program: r.program_type || "",
      house: r.house_name || "Ohne Haus",
      dates,
      people: r.number_of_people != null ? String(r.number_of_people) : "—",
      status: r.status || "reserved",
      contractStatus: cs,
      createdBy: r.created_by || "",
      sentAt: fmtDate(r.contract_sent_at),
      // Gespeicherter, angepasster Vertragstext (null = aus Daten generieren).
      contractText: r.contract_text || null,
      // Rohwerte für das Bearbeiten-Formular:
      groupLabel: r.group_label || "",
      houseId: r.house_id != null ? String(r.house_id) : "",
      peopleNum: r.number_of_people != null ? Number(r.number_of_people) : "",
      startDate: isoDate(r.start_date),
      endDate: isoDate(r.end_date),
      dateRangeText: r.date_range_text || "",
      // Aufenthaltsbeginn als sortierbarer Zeitstempel (null = Termin offen)
      startTs: r.start_date ? new Date(r.start_date).getTime() : null,
      deadline: deadlineFor(r.start_date, cs),
      // für Sortierung: Dringlichkeit
      _urgent: deadlineFor(r.start_date, cs).tone === "error",
    };
  });

  // Innerhalb "Entwurf" die dringendsten oben.
  items.sort((a, b) => (b._urgent ? 1 : 0) - (a._urgent ? 1 : 0));

  const groups = ["draft", "sent", "signed"].map((key) => ({
    key,
    label: STATUS_LABEL[key],
    items: items.filter((x) => x.contractStatus === key),
  }));

  const kpis = {
    draft: items.filter((x) => x.contractStatus === "draft").length,
    sent: items.filter((x) => x.contractStatus === "sent").length,
    signed: items.filter((x) => x.contractStatus === "signed").length,
    overdue: items.filter((x) => x.deadline.tone === "error").length,
    total: items.length,
  };

  const houses = await query(`SELECT id, name FROM houses ORDER BY name`);

  return { groups, kpis, houses: houses.map((h) => ({ id: String(h.id), name: h.name })) };
}

const ALLOWED = new Set(["draft", "sent", "signed"]);

// Editierbare Buchungsfelder aus der Verträge-Section. Schlüssel = JSON-Feld,
// Wert = Spalte. Nur diese dürfen über die API geändert werden.
const EDITABLE = {
  groupLabel: "group_label",
  contact: "contact_person",
  program: "program_type",
  peopleNum: "number_of_people",
  houseId: "house_id",
  startDate: "start_date",
  endDate: "end_date",
  dateRangeText: "date_range_text",
};

export async function updateBookingDetails(id, fields) {
  const sets = [];
  const vals = [Number(id)];
  for (const [key, col] of Object.entries(EDITABLE)) {
    if (!(key in fields)) continue;
    let v = fields[key];
    if (v === "" || v === undefined) v = null;
    if ((key === "peopleNum" || key === "houseId") && v != null) v = Number(v);
    vals.push(v);
    sets.push(`${col} = $${vals.length}`);
  }
  if (!sets.length) return null;
  const rows = await query(
    `UPDATE bookings SET ${sets.join(", ")}, updated_at = NOW()
      WHERE id = $1 RETURNING id`,
    vals
  );
  return rows[0] || null;
}

export async function updateContractText(id, text) {
  const clean = text && String(text).trim() ? text : null;
  const rows = await query(
    `UPDATE bookings SET contract_text = $2, updated_at = NOW()
      WHERE id = $1 RETURNING id, contract_text`,
    [Number(id), clean]
  );
  return rows[0] || null;
}

export async function updateContractStatus(id, status) {
  if (!ALLOWED.has(status)) return null;
  const rows = await query(
    `UPDATE bookings
        SET contract_status = $2,
            contract_sent_at = ${status === "sent" ? "NOW()" : "contract_sent_at"},
            contract_sent = ${status === "sent" || status === "signed" ? "TRUE" : "contract_sent"},
            updated_at = NOW()
      WHERE id = $1
      RETURNING id, contract_status, contract_sent_at`,
    [id, status]
  );
  return rows[0] || null;
}
