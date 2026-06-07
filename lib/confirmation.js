// lib/confirmation.js — Genera el borrador de email de confirmación al cliente
// a partir de los datos de la inquiry. Función pura (la usa el componente cliente).
// El staff lo edita antes de enviar.

export function buildConfirmationDraft(item) {
  const get = (key) => item.fields?.find((f) => f.key === key)?.value || "";

  const contact = item.from && item.from !== "Unbekannt" ? item.from : "";
  const dates = get("date_range");
  const people = get("number_of_people");
  const house = get("house");
  const program = get("program_type");

  // Anrede correcta según Frau/Herr; si no se sabe, fórmula neutra.
  const c = contact.trim();
  let anrede;
  if (/^frau\b/i.test(c)) anrede = `Sehr geehrte ${c},`;
  else if (/^herr\b/i.test(c)) anrede = `Sehr geehrter ${c},`;
  else anrede = "Sehr geehrte Damen und Herren,";

  const subject =
    "Ihre Anfrage" + (program ? ` – ${program}` : "") + (dates ? ` ${dates}` : "");

  // Párrafos separados por línea en blanco.
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
