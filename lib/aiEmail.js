// lib/aiEmail.js — Redacta con IA el e-mail al cliente (Rückfrage o Bestätigung).
// Genera SOLO el borrador {subject, body}; una persona lo revisa y lo envía por el
// flujo de n8n ya existente (Human-in-the-Loop). No envía nada por sí mismo.
import { chat } from "@/lib/ai";

const SYSTEM = `Du bist Mitarbeiter:in im Buchungsteam des ZUK Benediktbeuern (Don Bosco Jugendwerk), einem Jugend-Bildungshaus in Bayern. Schreibe freundliche, professionelle und knappe E-Mails an Schulen und Gruppenleiter:innen. Standardsprache ist Deutsch; wenn Name/Kontext klar auf Englisch sind, antworte auf Englisch. Nutze die passende Anrede (Frau/Herr, sonst "Sehr geehrte Damen und Herren"). Erfinde KEINE Daten, die nicht gegeben sind. Zähle KEINE sensiblen Gesundheitsdaten oder Klarnamen auf.`;

function ctxLines(c) {
  return [
    c.contact && `Ansprechperson: ${c.contact}`,
    c.school && `Schule/Gruppe: ${c.school}`,
    c.program && `Programm: ${c.program}`,
    c.house && `Haus: ${c.house}`,
    c.dates && `Zeitraum: ${c.dates}`,
    c.people && `Personen: ${c.people}`,
    c.grade && `Klassenstufe: ${c.grade}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// type: "followup" (faltan datos) | "confirmation" (confirmar la reserva)
export async function draftEmail({ type = "followup", context = {} }) {
  let task;
  if (type === "confirmation") {
    task =
      "Schreibe eine Buchungsbestätigung mit den unten genannten Daten. Bestätige den Aufenthalt und nenne knapp die nächsten Schritte (noch offene Restinfos, Fristen für Teilnehmerzahl/Allergien).";
  } else {
    const miss = (context.missing || []).map((m) => `- ${m}`).join("\n") || "- (keine)";
    task =
      "Schreibe eine Rückfrage-E-Mail: bedanke dich für die Anfrage und bitte freundlich um die noch FEHLENDEN Pflichtangaben:\n" +
      miss;
  }

  const user = `${task}\n\nDaten der Anfrage:\n${ctxLines(context)}\n\nGib NUR JSON zurück in genau diesem Schema: {"subject": "...", "body": "..."}. "body" ist reiner Text mit Zeilenumbrüchen (\\n) und endet mit der Grußformel "Mit freundlichen Grüßen\\nTeam Kloster Benediktbeuern".`;

  const out = await chat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    { json: true, temperature: 0.5 }
  );
  return { subject: out.subject || "", body: out.body || "" };
}
