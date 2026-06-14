// lib/mealplan.js — Küchen-/Verpflegungsplan aus einer Buchung.
// Interview: "Frühstück, Mittagssnack, Abendessen … Allergien als Zahlen an die
// Küche." Annahme: Anreise mittags, Abreise vormittags (Lunchpaket statt Mittag).
// Liefert eine strukturierte Matrix (Tabelle) UND einen Textentwurf (zum Kopieren).

function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function fmtShort(d) {
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.`;
}

export const MEAL_COLS = [
  { key: "fruehstueck", label: "Frühstück" },
  { key: "mittag", label: "Mittag" },
  { key: "kaffee", label: "Kaffee/Snack" },
  { key: "abend", label: "Abendessen" },
  { key: "lunchpaket", label: "Lunchpaket" },
];

// Strukturierte Tabelle: eine Zeile je Tag, Spalten = Mahlzeiten, Werte = Personen.
export function computeMealPlan(b) {
  const n = b.peopleNum || parseInt(String(b.people).match(/\d+/)?.[0] || "0", 10) || 0;
  const days = Math.max(1, b.days || 1);
  const start = parseISO(b.startDate);
  const dateFor = (i) => (start ? fmtShort(addDays(start, i)) : null);

  const mk = (label, date, m) => ({
    label, date,
    fruehstueck: m.fruehstueck ? n : 0,
    mittag: m.mittag ? n : 0,
    kaffee: m.kaffee ? n : 0,
    abend: m.abend ? n : 0,
    lunchpaket: m.lunchpaket ? n : 0,
  });

  const rows = [];
  if (days === 1) {
    // Tagesgruppe ohne Übernachtung.
    rows.push(mk("Tag", dateFor(0), { mittag: 1, kaffee: 1 }));
  } else {
    rows.push(mk("Anreise", dateFor(0), { mittag: 1, kaffee: 1, abend: 1 }));
    for (let i = 1; i < days - 1; i++) rows.push(mk("Volltag", dateFor(i), { fruehstueck: 1, mittag: 1, kaffee: 1, abend: 1 }));
    rows.push(mk("Abreise", dateFor(days - 1), { fruehstueck: 1, lunchpaket: 1 }));
  }

  const totals = rows.reduce(
    (t, r) => {
      for (const c of MEAL_COLS) t[c.key] += r[c.key];
      return t;
    },
    { fruehstueck: 0, mittag: 0, kaffee: 0, abend: 0, lunchpaket: 0 }
  );

  return { n, days, rows, totals };
}

// Textentwurf (zum Kopieren / Drucken-Fallback) — aus der gleichen Matrix.
export function buildMealPlan(b, diet = {}) {
  const plan = computeMealPlan(b);
  const pad = (x) => String(x).padStart(5, " ");
  const lines = [
    `KÜCHENPLAN`,
    `${b.title || b.school || "Gruppe"} · ${b.house || ""}`,
    ``,
    `Zeitraum: ${b.dates}   ·   ${plan.n} Personen   ·   ${plan.days} Tage`,
    ``,
    `Mahlzeit                 Anzahl`,
    `  Frühstück              ${pad(plan.totals.fruehstueck)}`,
    `  Mittagessen            ${pad(plan.totals.mittag)}`,
    `  Kaffee / Snack         ${pad(plan.totals.kaffee)}`,
    `  Abendessen             ${pad(plan.totals.abend)}`,
    `  Lunchpaket (Abreise)   ${pad(plan.totals.lunchpaket)}`,
    ``,
    `Diät / Allergien  (nur Zahlen — keine Klarnamen, DSGVO Art. 9)`,
    `  • Vegetarisch:          ${diet.veg ?? "____"}`,
    `  • Vegan:                ${diet.vegan ?? "____"}`,
    `  • Allergien/Unverträgl.:${diet.allergien ?? "____"}`,
    `  • Sonstiges:            ${diet.sonstiges ?? "____"}`,
    ``,
    `Hinweis: endgültige Zahlen bis 2 Wochen vor Anreise an die Küche.`,
  ];
  return lines.join("\n");
}
