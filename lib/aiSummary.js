// lib/aiSummary.js — Resumen inteligente del cliente (escuela/grupo) con IA.
// Junta el historial (reservas + Anfragen) y las notas del equipo de esa escuela,
// y pide a la IA un resumen de 1–2 frases para el operador ("Stammkunde, immer
// vegetarisch, bevorzugt Aktionszentrum …"). Server-side; reusa lib/ai.js.
import { chat } from "@/lib/ai";
import { getSchoolHistory } from "@/lib/history";
import { getNotes } from "@/lib/notes";

const SYSTEM = `Du fasst für das Buchungsteam des ZUK Benediktbeuern eine Schule/Gruppe in 1–2 knappen deutschen Sätzen zusammen. Nenne, ob es ein Stammkunde ist, wiederkehrende Programme/Wünsche, Präferenzen (z. B. Haus, Verpflegung) und Besonderes. Erfinde NICHTS; nutze nur die gegebenen Daten. KEINE sensiblen Gesundheitsdaten und KEINE Klarnamen.`;

export async function summarizeSchool(schoolName) {
  if (!schoolName || schoolName.startsWith("—")) return null;

  const history = await getSchoolHistory(schoolName);
  const notes = await getNotes(null, schoolName);
  if (!history && (!notes || notes.length === 0)) return { summary: "" };

  const lines = [];
  if (history) {
    lines.push(`Frühere Buchungen: ${history.bookingsCount}, frühere Anfragen: ${history.priorInquiries}.`);
    for (const b of history.bookings) {
      lines.push(`- ${b.dates} · ${b.program} · ${b.people} Personen · ${b.status}`);
    }
  }
  if (notes && notes.length) {
    lines.push("Team-Notizen:");
    for (const n of notes.slice(0, 8)) lines.push(`- ${n.body}`);
  }

  const summary = await chat(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Schule/Gruppe: ${schoolName}\n\nDaten:\n${lines.join("\n")}\n\nGib NUR den Fließtext zurück (kein JSON, keine Aufzählung).`,
      },
    ],
    { temperature: 0.3 }
  );
  return { summary: (summary || "").trim() };
}
