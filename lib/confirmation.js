// lib/confirmation.js — Builds the customer confirmation email draft from the
// inquiry data. Pure function (used by the client component). The staff edits it
// before sending.

export function buildConfirmationDraft(item) {
  const get = (key) => item.fields?.find((f) => f.key === key)?.value || "";

  const contact = item.from && item.from !== "Unbekannt" ? item.from : "";
  const dates = get("date_range");
  const people = get("number_of_people");
  const house = get("house");
  const program = get("program_type");

  // Correct salutation based on Frau/Herr; neutral form if unknown.
  const c = contact.trim();
  let anrede;
  if (/^frau\b/i.test(c)) anrede = `Sehr geehrte ${c},`;
  else if (/^herr\b/i.test(c)) anrede = `Sehr geehrter ${c},`;
  else anrede = "Sehr geehrte Damen und Herren,";

  const subject =
    "Ihre Anfrage" + (program ? ` – ${program}` : "") + (dates ? ` ${dates}` : "");

  // Paragraphs separated by a blank line.
  const paragraphs = [
    anrede,
    `vielen Dank für Ihre Anfrage. Wir freuen uns, Ihnen den Aufenthalt${
      dates ? ` vom ${dates}` : ""
    }${house ? ` (${house})` : ""} zu bestätigen.${people ? ` Gruppe: ${people}.` : ""}`,
    "Bitte senden Sie uns die finale Teilnehmerliste rechtzeitig vor der Anreise zu.",
    "Mit freundlichen Grüßen\nTeam Kloster Benediktbeuern",
  ];

  return {
    to: item.customerEmail || "",
    subject,
    body: paragraphs.join("\n\n"),
  };
}

// Sammel-Bestätigung für eine E-Mail mit mehreren Buchungen: EINE Mail an die
// Schule, die alle Gruppen mit Termin/Personenzahl auflistet.
export function buildSplitConfirmation(items = []) {
  const primary = items[0] || {};
  const get = (it, k) => it.fields?.find((f) => f.key === k)?.value || "";

  const contact = (primary.from && primary.from !== "Unbekannt" ? primary.from : "").trim();
  let anrede;
  if (/^frau\b/i.test(contact)) anrede = `Sehr geehrte ${contact},`;
  else if (/^herr\b/i.test(contact)) anrede = `Sehr geehrter ${contact},`;
  else anrede = "Sehr geehrte Damen und Herren,";

  const lines = items
    .map((it) => {
      const label = get(it, "grade_level") || get(it, "program_type") || it.school || "Gruppe";
      const dates = get(it, "date_range") || "Termin offen";
      const people = get(it, "number_of_people");
      return `  • ${label}: ${dates}${people ? ` (${people})` : ""}`;
    })
    .join("\n");

  const subject = `Ihre Anfrage – ${items.length} Gruppen`;
  const body = [
    anrede,
    "",
    "vielen Dank für Ihre Anfrage. Wir freuen uns, Ihnen folgende Aufenthalte zu bestätigen:",
    "",
    lines,
    "",
    "Bitte senden Sie uns die finalen Teilnehmerlisten rechtzeitig vor der Anreise zu.",
    "",
    "Mit freundlichen Grüßen",
    "Team Kloster Benediktbeuern",
  ].join("\n");

  return { to: primary.customerEmail || "", subject, body };
}
