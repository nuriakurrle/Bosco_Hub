// lib/contracts.js — Verträge-Übersicht: Buchungen nach Vertrags-Status, mit
// Frist relativ zum Aufenthaltsbeginn. Interview: der Vertrag geht ~2 Wochen
// vor Anreise raus — hier als Frist-Ampel sichtbar gemacht.
import { query } from "@/lib/db";

const LEAD_DAYS = 14; // Vertrag sollte ~14 Tage vor Aufenthalt versendet sein

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()}`;
}

// Frist-Ampel für einen Entwurf (nur relevant, solange nicht versendet/bestätigt).
function deadlineFor(startDate, status) {
  if (!startDate) return { tone: "neutral", label: "Termin offen" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const daysToStart = Math.round((start - today) / 86400000);

  if (status === "signed") return { tone: "success", label: "bestätigt" };
  if (status === "sent") return { tone: "info", label: "versendet" };

  // Entwurf:
  if (daysToStart < 0) return { tone: "neutral", label: "Aufenthalt vergangen" };
  const daysToDue = daysToStart - LEAD_DAYS; // ab hier sollte der Vertrag raus
  if (daysToDue <= 0) return { tone: "error", label: daysToStart === 0 ? "Anreise heute!" : `Vertrag überfällig · Anreise in ${daysToStart} T.` };
  if (daysToDue <= 7) return { tone: "warn", label: `Vertrag fällig in ${daysToDue} Tagen` };
  return { tone: "neutral", label: `Vertrag in ${daysToDue} Tagen fällig` };
}

const STATUS_LABEL = { draft: "Entwurf nötig", sent: "Versendet", signed: "Bestätigt" };

export async function getContractsOverview() {
  const rows = await query(
    `SELECT b.id, b.start_date, b.end_date, b.date_range_text, b.number_of_people,
            b.group_label, b.contact_person, b.program_type, b.status,
            b.contract_status, b.contract_sent_at, b.created_by, b.inquiry_id,
            h.name AS house_name, i.school_name
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
      program: r.program_type || "",
      house: r.house_name || "Ohne Haus",
      dates,
      people: r.number_of_people != null ? String(r.number_of_people) : "—",
      status: r.status || "reserved",
      contractStatus: cs,
      sentAt: fmtDate(r.contract_sent_at),
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

  return { groups, kpis };
}

const ALLOWED = new Set(["draft", "sent", "signed"]);

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
