// lib/dashboard.js — Aggregierte Kennzahlen für die Übersicht-Seite.
// Alles aus den echten Tabellen (inquiries, bookings, houses). Keine Preise im
// System → keine Umsatzzahlen, sondern operative KPIs.
import { query } from "@/lib/db";
import { HOUSE_CAPACITY } from "@/lib/availability";

function capacityFor(houseName = "") {
  const h = houseName.toLowerCase();
  if (h.includes("jugendherberge")) return HOUSE_CAPACITY.jugendherberge.beds;
  if (h.includes("aktionszentrum")) return HOUSE_CAPACITY.aktionszentrum.beds;
  return null;
}

function relTime(date) {
  if (!date) return "";
  const min = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? "gestern" : `vor ${d} Tagen`;
}

export async function getDashboard() {
  // ── Anfragen (inquiries) ────────────────────────────────────────────────
  const statusRows = await query(
    `SELECT tracker_status, count(*)::int AS n FROM inquiries GROUP BY tracker_status`
  );
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.tracker_status, r.n]));
  const totalInquiries = statusRows.reduce((s, r) => s + r.n, 0);
  const booked = byStatus["booking_created"] || 0;
  const needsInfo = byStatus["needs_info"] || 0;
  const open = totalInquiries - booked; // alles, was noch nicht zur Buchung wurde
  const fresh = open - needsInfo; // "neu / prüfbereit"

  const [{ n: unassigned }] = await query(
    `SELECT count(*)::int AS n FROM inquiries
      WHERE assigned_to IS NULL AND tracker_status <> 'booking_created'`
  );
  const [{ n: sensitive }] = await query(
    `SELECT count(*)::int AS n FROM inquiries WHERE contains_sensitive_data = TRUE`
  );
  const [{ n: thisWeek }] = await query(
    `SELECT count(*)::int AS n FROM inquiries WHERE received_at >= NOW() - INTERVAL '7 days'`
  );

  // ── Buchungen (bookings) ────────────────────────────────────────────────
  const [bk] = await query(
    `SELECT count(*)::int AS total,
            COALESCE(SUM(number_of_people),0)::int AS guests,
            count(*) FILTER (WHERE start_date = CURRENT_DATE)::int AS checkin_today,
            count(*) FILTER (WHERE end_date   = CURRENT_DATE)::int AS checkout_today
       FROM bookings`
  );

  // Belegung je Haus: gebuchte Betten (reserviert) vs. Kapazität (Schätzung).
  const houseRows = await query(
    `SELECT h.name AS house, COALESCE(SUM(b.number_of_people),0)::int AS people,
            count(b.id)::int AS bookings
       FROM houses h
       LEFT JOIN bookings b ON b.house_id = h.id
      GROUP BY h.name ORDER BY h.name`
  );
  const houses = houseRows.map((r) => {
    const cap = capacityFor(r.house);
    return {
      house: r.house,
      people: r.people,
      bookings: r.bookings,
      capacity: cap,
      ratio: cap ? Math.min(1, r.people / cap) : null,
    };
  });

  // ── Anfragen-Eingang pro Tag (letzte 14 Tage) für das Linien-Chart ──────
  const series = await query(
    `SELECT to_char(d::date, 'DD.MM') AS label,
            COALESCE(c.n, 0)::int AS n
       FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') d
       LEFT JOIN (
         SELECT date_trunc('day', received_at) AS day, count(*) AS n
           FROM inquiries GROUP BY 1
       ) c ON c.day = d::date
      ORDER BY d`
  );

  // ── Letzte Aktivitäten ─────────────────────────────────────────────────
  const recentRows = await query(
    `SELECT id, school_name, contact_person, summary, original_subject,
            program_type, date_range, received_at, tracker_status, channel
       FROM inquiries ORDER BY received_at DESC LIMIT 6`
  );
  const recent = recentRows.map((r) => ({
    id: String(r.id),
    school: r.school_name || "Unbekannt",
    who: r.contact_person || "",
    text:
      r.summary ||
      r.original_subject ||
      [r.program_type, r.date_range].filter(Boolean).join(" · ") ||
      "Anfrage",
    time: relTime(r.received_at),
    status: r.tracker_status,
    channel: r.channel || "email",
  }));

  // ── Last je Person (Team) ──────────────────────────────────────────────
  const teamRows = await query(
    `SELECT s.name, s.short, count(i.id) FILTER (WHERE i.tracker_status <> 'booking_created')::int AS open
       FROM staff s
       LEFT JOIN inquiries i ON i.assigned_to = s.key
      WHERE s.active = TRUE
      GROUP BY s.name, s.short ORDER BY open DESC, s.name`
  );

  return {
    kpis: {
      open,
      fresh,
      needsInfo,
      booked,
      unassigned,
      sensitive,
      thisWeek,
      bookings: bk.total,
      guests: bk.guests,
      checkinToday: bk.checkin_today,
      checkoutToday: bk.checkout_today,
    },
    statusDonut: [
      { key: "fresh", label: "Neu / prüfbereit", value: fresh, tone: "info" },
      { key: "needsInfo", label: "Info fehlt", value: needsInfo, tone: "warn" },
      { key: "booked", label: "Buchung angelegt", value: booked, tone: "success" },
    ],
    totalInquiries,
    series,
    houses,
    recent,
    team: teamRows,
  };
}
