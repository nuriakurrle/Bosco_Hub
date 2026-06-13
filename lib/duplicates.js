// lib/duplicates.js — Doppel-Anfrage-Erkennung.
// Interview (ZUK): Schulen schicken dieselbe Anfrage über mehrere Kanäle
// (Telefon + E-Mail) und das Team muss manuell prüfen, ob etwas doppelt ist.
// Hier ein leichtgewichtiger Ähnlichkeits-Score gegen bereits angelegte
// Buchungen: Schule (Name) + Zeitraum (überlappende/gleiche Tage).
import { parseDateRange } from "@/lib/availability";

// Normalisiert Schulnamen für den Vergleich (Kleinschreibung, Rechtsform/Worte
// wie "schule"/"gymnasium" zählen weniger, Umlaute vereinfacht).
function tokens(name = "") {
  return new Set(
    name
      .toLowerCase()
      .replace(/[äöü]/g, (c) => ({ ä: "a", ö: "o", ü: "u" }[c]))
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

// Jaccard-Ähnlichkeit zweier Token-Mengen (0..1).
function tokenSim(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function datesOverlap(aText, bText) {
  const a = parseDateRange(aText || "");
  const b = parseDateRange(bText || "");
  if (!a.parseable || !b.parseable) {
    // Wenn nicht parsebar: gleicher Text zählt als Treffer.
    return aText && bText && aText.trim() === bText.trim() ? 1 : 0;
  }
  return a.start <= b.end && b.start <= a.end ? 1 : 0;
}

// Findet die ähnlichste bestehende Buchung zu einem Inquiry.
// `bookings` = Ausgabe von getBookings() (school, dates, contact, id, title).
// Gibt { booking, score, reasons } zurück oder null, wenn nichts über 0.55.
export function findSimilarBooking(item, bookings = []) {
  const schoolTokens = tokens(item.school || "");
  const itemDates = item.fields?.find((f) => f.key === "date_range")?.value || "";
  let best = null;

  for (const b of bookings) {
    // Eine bereits aus DIESEM Inquiry erzeugte Buchung ist kein Duplikat.
    if (b.inquiryId && String(b.inquiryId) === String(item.id)) continue;

    const sName = tokenSim(schoolTokens, tokens(b.school || b.title || ""));
    const dOverlap = datesOverlap(itemDates, b.dates);
    const score = sName * 0.65 + dOverlap * 0.35;

    const reasons = [];
    if (sName >= 0.5) reasons.push("gleiche Schule/Gruppe");
    if (dOverlap) reasons.push("überschneidender Zeitraum");

    if (score > (best?.score || 0)) best = { booking: b, score, reasons };
  }

  return best && best.score >= 0.55 ? best : null;
}
