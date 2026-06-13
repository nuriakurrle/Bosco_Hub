// lib/contract.js — leichter Vertrags-/Buchungsbestätigungs-Entwurf aus den
// Buchungsdaten. Reiner Text-Generator (keine API). Felder ohne Datenpendant
// (Preis, genaue Leistung) erscheinen als Platzhalter zum Ausfüllen.
// Der finale Word/PDF-Export läuft später über n8n.
export function buildContractDraft(b) {
  const today = new Date().toLocaleDateString("de-DE");
  const L = (s) => (s && String(s).trim() ? s : "____");
  return [
    `BUCHUNGSBESTÄTIGUNG / VERTRAG (Entwurf)`,
    `Zentrum für Umwelt und Kultur (ZUK) · Benediktbeuern`,
    ``,
    `Datum:           ${today}`,
    `Buchungs-Nr.:    ${L(b.id)}`,
    ``,
    `Gruppe / Schule: ${L(b.school || b.title)}`,
    `Ansprechperson:  ${L(b.contact)}`,
    `Programm/Format: ${L(b.program)}`,
    `Haus:            ${L(b.house)}`,
    `Zeitraum:        ${L(b.dates)}`,
    `Teilnehmende:    ${L(b.people)} Personen`,
    ``,
    `Leistungen`,
    `  • Übernachtung im ${L(b.house)}`,
    `  • Verpflegung: ____  (z. B. Vollpension)`,
    `  • Programm: ${L(b.program)}`,
    `  • Seminarraum: ____`,
    ``,
    `Preis / Konditionen: ____   (aus Hausmanager ergänzen)`,
    ``,
    `Wichtige Termine`,
    `  • Geschlechter-Aufteilung (Zimmerzuteilung): bis 4 Wochen vorher`,
    `  • Allergien / Diät (Küche): bis 2 Wochen vorher`,
    `  • Endgültige Teilnehmerzahl: bis 2 Wochen vorher`,
    ``,
    `Status: ${L(b.status)}`,
    `Bearbeitet von: ${L(b.createdBy)}`,
    ``,
    `Mit freundlichen Grüßen`,
    `ZUK Benediktbeuern`,
  ].join("\n");
}
