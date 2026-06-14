// lib/bookings.js — Reads the created bookings (`bookings` table), joined with
// the house and the source inquiry, for the "Buchungen" view.
import { query } from "@/lib/db";
import { isoDate } from "@/lib/datefmt";

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
}

function rowToBooking(row) {
  // Dates: if we have concrete start/end dates show them; otherwise the free text.
  let dates;
  if (row.start_date && row.end_date) {
    dates = `${fmtDate(row.start_date)} – ${fmtDate(row.end_date)}`;
  } else if (row.start_date) {
    dates = fmtDate(row.start_date);
  } else {
    dates = row.date_range_text || "—";
  }

  return {
    id: String(row.id),
    inquiryId: row.inquiry_id ? String(row.inquiry_id) : null,
    house: row.house_name || "Ohne Haus",
    title: row.group_label || row.school_name || "Buchung",
    school: row.school_name || "",
    contact: row.contact_person || "",
    program: row.program_type || "",
    dates,
    people: row.number_of_people != null ? String(row.number_of_people) : "—",
    peopleNum: row.number_of_people != null ? Number(row.number_of_people) : "",
    startISO: row.start_date ? new Date(row.start_date).toISOString() : null,
    days:
      row.start_date && row.end_date
        ? Math.max(1, Math.round((new Date(row.end_date) - new Date(row.start_date)) / 86400000) + 1)
        : null,
    status: row.status || "reserved",
    contractStatus: row.contract_status || "draft",
    createdBy: row.created_by || "",
    createdAt: fmtDate(row.created_at),
    // Rohwerte für das Bearbeiten-Formular:
    groupLabel: row.group_label || "",
    houseId: row.house_id != null ? String(row.house_id) : "",
    startDate: isoDate(row.start_date),
    endDate: isoDate(row.end_date),
    dateRangeText: row.date_range_text || "",
    contractText: row.contract_text || null,
  };
}

export async function getHouses() {
  const rows = await query(`SELECT id, name FROM houses ORDER BY name`);
  return rows.map((h) => ({ id: String(h.id), name: h.name }));
}

export async function getBookings() {
  const rows = await query(
    `SELECT b.*, h.name AS house_name, i.school_name
       FROM bookings b
       LEFT JOIN houses h    ON h.id = b.house_id
       LEFT JOIN inquiries i ON i.id = b.inquiry_id
      ORDER BY h.name NULLS LAST, b.start_date NULLS LAST, b.id DESC`
  );
  return rows.map(rowToBooking);
}

// Erledigt-Status aller Vorbereitungs-Aufgaben (Timeline), gruppiert je Buchung.
export async function getAllTasksDone() {
  const rows = await query(`SELECT booking_id, task_key, done FROM booking_tasks WHERE done = TRUE`);
  const map = {};
  for (const r of rows) {
    (map[r.booking_id] ||= {})[r.task_key] = { done: r.done };
  }
  return map;
}

// Eine Aufgabe als erledigt/offen markieren (Upsert).
export async function setBookingTask(bookingId, taskKey, done, by) {
  await query(
    `INSERT INTO booking_tasks (booking_id, task_key, done, done_at, done_by)
     VALUES ($1, $2, $3, ${done ? "NOW()" : "NULL"}, $4)
     ON CONFLICT (booking_id, task_key)
     DO UPDATE SET done = $3, done_at = ${done ? "NOW()" : "NULL"}, done_by = $4`,
    [Number(bookingId), taskKey, !!done, by || null]
  );
  return { bookingId: String(bookingId), taskKey, done: !!done };
}

// Lightweight occupancy feed for the availability check (lib/availability.js):
// every booking with concrete dates, its house and headcount. Free-text-only
// bookings (no parseable dates) can't be placed on a calendar, so we skip them.
export async function getOccupancy() {
  const rows = await query(
    `SELECT b.start_date, b.end_date, b.number_of_people, h.name AS house_name
       FROM bookings b
       LEFT JOIN houses h ON h.id = b.house_id
      WHERE b.start_date IS NOT NULL`
  );
  return rows.map((r) => ({
    house: r.house_name || "",
    start: r.start_date ? new Date(r.start_date) : null,
    end: r.end_date ? new Date(r.end_date) : r.start_date ? new Date(r.start_date) : null,
    people: r.number_of_people != null ? Number(r.number_of_people) : 0,
  }));
}
