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
