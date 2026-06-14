// lib/deadline.js — Frist-Ampel für den Vertrag relativ zum Aufenthaltsbeginn.
// Eine Quelle der Wahrheit: genutzt von der Datenschicht (lib/contracts) und der
// Live-Neuberechnung im Client (components/ContractsView) nach dem Bearbeiten.
// Interview: der Vertrag geht ~2 Wochen vor Anreise raus.
export const LEAD_DAYS = 14; // Vertrag sollte ~14 Tage vor Aufenthalt versendet sein

// startDate: Date oder "yyyy-mm-dd" (leer/null = Termin offen).
export function deadlineFor(startDate, status) {
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
