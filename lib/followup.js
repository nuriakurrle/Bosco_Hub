// lib/followup.js — Nachfass-E-Mail an den Kunden, wenn Infos fehlen.
// Interview: "Wir brauchen einen Agenten, der den Kunden anspammt: du hast nicht
// geantwortet, bitte schick die fehlenden Infos." Hier als Entwurf, den eine
// Person prüft und versendet (Human-in-the-Loop). Bezieht sich auf die offenen
// Vorbereitungs-Aufgaben (Timeline) — nur die kundenrelevanten.

// Feld-Schlüssel (Posteingang-Extraktion) → konkrete, ausfüllbare Bitte. Wird für
// die Rückfrage-/Nachfass-E-Mail aus einer Anfrage genutzt (fehlende Pflichtinfos).
const INQUIRY_ASK = {
  date_range: "den gewünschten Zeitraum (Anreise / Abreise)",
  number_of_people: "die Teilnehmerzahl",
  grade_level: "die Klassenstufe / das Alter der Gruppe",
  contact_person: "eine Ansprechperson mit Telefonnummer",
  customer_email: "eine E-Mail-Adresse für die Rückmeldung",
  program_type: "das gewünschte Programm / Format",
  house: "das gewünschte Haus (falls eine Präferenz besteht)",
  school_name: "den Namen der Schule / Gruppe",
};

// Rückfrage-/Nachfass-E-Mail aus einer Anfrage (Posteingang): listet genau die
// fehlenden Pflicht-Angaben auf. Liefert {to, subject, body} — der Entwurf wird
// von einer Person geprüft und versendet (Human-in-the-Loop).
export function buildInquiryFollowUp(item, missing = []) {
  const get = (key) => item.fields?.find((f) => f.key === key)?.value || "";
  const contact = (item.from && item.from !== "Unbekannt" ? item.from : "").trim();
  let anrede;
  if (/^frau\b/i.test(contact)) anrede = `Sehr geehrte ${contact},`;
  else if (/^herr\b/i.test(contact)) anrede = `Sehr geehrter ${contact},`;
  else anrede = "Sehr geehrte Damen und Herren,";

  const dates = get("date_range");
  const program = get("program_type");
  const subject = "Rückfrage zu Ihrer Anfrage" + (program ? ` – ${program}` : "") + (dates ? ` ${dates}` : "");

  const bullets = missing.length
    ? missing.map((m) => `  • ${INQUIRY_ASK[m.key] || m.label}`).join("\n")
    : "  • (alle erforderlichen Angaben liegen vor)";

  const body = [
    anrede,
    "",
    "vielen Dank für Ihre Anfrage. Damit wir Ihnen ein verbindliches Angebot machen",
    "und den Aufenthalt vorbereiten können, fehlen uns noch folgende Angaben:",
    "",
    bullets,
    "",
    "Bitte senden Sie uns diese Informationen kurz zurück. Bei Rückfragen sind wir",
    "gerne für Sie da.",
    "",
    "Mit freundlichen Grüßen",
    "Team Kloster Benediktbeuern",
  ].join("\n");

  return { to: item.customerEmail || "", subject, body };
}

// Klassen-/Gruppen-Label aus einer Anfrage-Zeile (für die Sammel-Rückfrage).
function classLabelOf(item) {
  const get = (k) => item.fields?.find((f) => f.key === k)?.value || "";
  return get("grade_level") || get("program_type") || item.school || "Gruppe";
}

// Sammel-Rückfrage für eine E-Mail mit mehreren Buchungen: EINE Mail an die
// Schule, die die fehlenden Pflicht-Angaben pro Klasse gruppiert auflistet.
// `missingByItem` = { [inquiryId]: [{ key, label }] } (aktueller Stand).
export function buildSplitFollowUp(items = [], missingByItem = {}) {
  const primary = items[0] || {};
  const contact = (primary.from && primary.from !== "Unbekannt" ? primary.from : "").trim();
  let anrede;
  if (/^frau\b/i.test(contact)) anrede = `Sehr geehrte ${contact},`;
  else if (/^herr\b/i.test(contact)) anrede = `Sehr geehrter ${contact},`;
  else anrede = "Sehr geehrte Damen und Herren,";

  const blocks = items
    .map((it) => {
      const miss = missingByItem[it.id] || [];
      if (!miss.length) return null;
      const bullets = miss.map((m) => `    • ${INQUIRY_ASK[m.key] || m.label}`).join("\n");
      return `  Für ${classLabelOf(it)}:\n${bullets}`;
    })
    .filter(Boolean);

  const subject = `Rückfrage zu Ihrer Anfrage – ${items.length} Gruppen`;
  const body = [
    anrede,
    "",
    `vielen Dank für Ihre Anfrage für ${items.length} Gruppen. Damit wir Ihnen ein`,
    "verbindliches Angebot machen können, fehlen uns je Gruppe noch folgende Angaben:",
    "",
    blocks.join("\n\n"),
    "",
    "Bitte senden Sie uns diese Informationen kurz zurück. Bei Rückfragen sind wir",
    "gerne für Sie da.",
    "",
    "Mit freundlichen Grüßen",
    "Team Kloster Benediktbeuern",
  ].join("\n");

  return { to: primary.customerEmail || "", subject, body };
}

// Timeline-Schlüssel → konkrete Bitte an den Kunden. Nur diese sind kundenseitig
// (contract/bus/detail sind interne Aufgaben).
export const FOLLOWUP_ASK = {
  numbers: "die endgültige Teilnehmerzahl",
  gender: "die Aufteilung nach Geschlecht (für die Zimmerzuteilung)",
  allergies: "Allergien und Diät-Wünsche — bitte nur die Anzahl, keine Namen",
};

// Welche offenen Aufgaben lassen sich überhaupt beim Kunden nachfassen?
export function customerOpenKeys(openKeys = []) {
  return openKeys.filter((k) => k in FOLLOWUP_ASK);
}

export function buildFollowUp(b, openKeys = []) {
  const asks = customerOpenKeys(openKeys).map((k) => FOLLOWUP_ASK[k]);
  const greeting = b.contact ? `Liebe/r ${b.contact},` : "Sehr geehrte Damen und Herren,";
  const group = b.title || b.school || "Ihre Gruppe";
  const bullets = asks.length
    ? asks.map((a) => `  • ${a}`).join("\n")
    : "  • (alle erforderlichen Angaben liegen vor)";

  return [
    `Betreff: Ihr Aufenthalt im ZUK Benediktbeuern — noch fehlende Angaben`,
    ``,
    greeting,
    ``,
    `vielen Dank für Ihre Buchung „${group}" (${b.dates || "Termin offen"}, ${b.house || "ZUK"}).`,
    `Damit wir alles rechtzeitig vorbereiten können, fehlen uns noch folgende Angaben:`,
    ``,
    bullets,
    ``,
    `Bitte senden Sie uns diese Informationen möglichst bald zurück — idealerweise`,
    `spätestens zwei Wochen vor Anreise, damit Zimmerplanung und Küche rechtzeitig stehen.`,
    ``,
    `Bei Fragen sind wir gern für Sie da. Herzliche Grüße`,
    `ZUK Benediktbeuern`,
  ].join("\n");
}
