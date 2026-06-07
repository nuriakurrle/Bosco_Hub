// lib/bookings.js — Lectura de las reservas creadas (tabla `bookings`),
// unidas con la casa y con la inquiry de origen, para la vista "Buchungen".
import { query } from "@/lib/db";

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
}

function rowToBooking(row) {
  // Fechas: si hay start/end concretas las mostramos; si no, el texto libre.
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
    status: row.status || "reserved",
    createdBy: row.created_by || "",
    createdAt: fmtDate(row.created_at),
  };
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
