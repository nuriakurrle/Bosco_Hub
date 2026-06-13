// lib/mealplan.js — Küchen-/Verpflegungsplan-Entwurf aus einer Buchung.
// Interview: "Frühstück, Mittagssnack, Abendessen … Allergien als Zahlen an die
// Küche." Nur Zahlen, keine Klarnamen (DSGVO). Reiner Text-Generator.
export function buildMealPlan(b) {
  const n = b.peopleNum || parseInt(String(b.people).match(/\d+/)?.[0] || "0", 10) || 0;
  const days = b.days || 1; // inkl. An- und Abreisetag
  const full = Math.max(0, days - 2); // volle Tage zwischen An- und Abreise
  const pad = (x) => String(x).padStart(4, " ");

  // Annahme: Anreise mittags, Abreise vormittags.
  const fruehstueck = (full + 1) * n; // alle Tage außer Anreisetag
  const mittag = days * n; // jeden Tag (Anreise: Snack, Abreise: Lunchpaket)
  const abend = (full + 1) * n; // alle Tage außer Abreisetag
  const lunchpaket = n; // Abreisetag

  const row = (label, val, note = "") => `  ${label.padEnd(24)}${pad(val)}${note ? "   " + note : ""}`;

  return [
    `KÜCHENPLAN (Entwurf)`,
    `${b.title || b.school || "Gruppe"} · ${b.house || ""}`,
    ``,
    `Zeitraum: ${b.dates}   ·   ${n} Personen   ·   ${days} Tage`,
    ``,
    `Mahlzeit                 Anzahl`,
    row("Frühstück", fruehstueck),
    row("Mittagessen", mittag),
    row("Abendessen", abend),
    row("Lunchpaket (Abreise)", lunchpaket, "(bei Ausflug/Abreise)"),
    `  Kaffee / Snack          nach Bedarf`,
    ``,
    `Diät / Allergien  (nur Zahlen — keine Klarnamen, DSGVO Art. 9)`,
    `  • Vegetarisch:          ____`,
    `  • Vegan:                ____`,
    `  • Allergien/Unverträgl.:____`,
    `  • Sonstiges:            ____`,
    ``,
    `Hinweis: endgültige Zahlen bis 2 Wochen vor Anreise an die Küche.`,
  ].join("\n");
}
