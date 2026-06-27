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

// Liest die Anforderungen aus dem Anfrage-Freitext (special_requirements):
// Verpflegungsart + Diät-Flags + (falls genannt) Zahlen. Keine Klarnamen.
export function parseRequirements(text = "") {
  const t = (text || "").toLowerCase();
  let board = null;
  if (/vollpension|vollverpflegung/.test(t)) board = "Vollpension";
  else if (/halbpension/.test(t)) board = "Halbpension";
  else if (/selbstversorg/.test(t)) board = "Selbstversorger";
  else if (/nur frühstück|übernachtung mit frühstück|ü\/f|ünf/.test(t)) board = "Übernachtung/Frühstück";

  const num = (re) => { const m = t.match(re); return m ? m[1] : null; };
  const veg = num(/(\d+)\s*(?:vegetari)/);
  const vegan = num(/(\d+)\s*vegan/);
  const allerg = num(/(\d+)\s*(?:allergi|laktose|gluten|nuss|erdnuss|unverträg)/);

  const flags = [];
  if (/vegetari/.test(t)) flags.push("Vegetarisch");
  if (/vegan/.test(t)) flags.push("Vegan");
  if (/laktose/.test(t)) flags.push("Laktosefrei");
  if (/gluten|zöliakie/.test(t)) flags.push("Glutenfrei");
  if (/nuss|erdnuss/.test(t)) flags.push("Nussallergie");
  if (/halal/.test(t)) flags.push("Halal");
  if (/allergi|unverträg/.test(t) && !flags.length) flags.push("Allergien");

  return { board, veg, vegan, allerg, flags: [...new Set(flags)], raw: text || "" };
}

// Verpflegung aus dem Anfrageformular (Dropdown) auf unsere Tagestypen normieren.
function normalizeBoard(v) {
  const t = (v || "").toLowerCase();
  if (!t) return null;
  if (/vollpension|vollverpfleg/.test(t)) return "Vollpension";
  if (/halbpension/.test(t)) return "Halbpension";
  if (/selbstvers|küchennutzung/.test(t)) return "Selbstversorger";
  if (/frühstück/.test(t)) return "Übernachtung/Frühstück";
  if (/keine/.test(t)) return "Keine";
  return null;
}

// Welche Mahlzeiten je Tagestyp — abhängig von der Verpflegungsart.
function mealsForBoard(board) {
  if (board === "Selbstversorger" || board === "Keine") {
    const none = {};
    return { tag: none, anreise: none, volltag: none, abreise: none };
  }
  if (board === "Halbpension") {
    return {
      tag: { mittag: 1 },
      anreise: { abend: 1 },
      volltag: { fruehstueck: 1, abend: 1 },
      abreise: { fruehstueck: 1 },
    };
  }
  if (board === "Übernachtung/Frühstück") {
    return { tag: {}, anreise: {}, volltag: { fruehstueck: 1 }, abreise: { fruehstueck: 1 } };
  }
  // Vollpension (Standard-Annahme)
  return {
    tag: { mittag: 1, kaffee: 1 },
    anreise: { mittag: 1, kaffee: 1, abend: 1 },
    volltag: { fruehstueck: 1, mittag: 1, kaffee: 1, abend: 1 },
    abreise: { fruehstueck: 1, lunchpaket: 1 },
  };
}

// Strukturierte Tabelle: eine Zeile je Tag, Spalten = Mahlzeiten, Werte = Personen.
// Verpflegungsart kommt aus den Anfrage-Anforderungen (sonst Vollpension angenommen).
export function computeMealPlan(b) {
  const n = b.peopleNum || parseInt(String(b.people).match(/\d+/)?.[0] || "0", 10) || 0;
  const days = Math.max(1, b.days || 1);
  const start = parseISO(b.startDate);
  const dateFor = (i) => (start ? fmtShort(addDays(start, i)) : null);

  const reqs = parseRequirements(b.specialRequirements);
  // Explizite Verpflegung aus dem Anfrageformular hat Vorrang; sonst aus Freitext.
  const explicit = normalizeBoard(b.boardType);
  const board = explicit || reqs.board || "Vollpension";
  const assumedBoard = !explicit && !reqs.board; // nichts angegeben → Annahme
  const incl = mealsForBoard(board);

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
    rows.push(mk("Tag", dateFor(0), incl.tag));
  } else {
    rows.push(mk("Anreise", dateFor(0), incl.anreise));
    for (let i = 1; i < days - 1; i++) rows.push(mk("Volltag", dateFor(i), incl.volltag));
    rows.push(mk("Abreise", dateFor(days - 1), incl.abreise));
  }

  const totals = rows.reduce(
    (t, r) => {
      for (const c of MEAL_COLS) t[c.key] += r[c.key];
      return t;
    },
    { fruehstueck: 0, mittag: 0, kaffee: 0, abend: 0, lunchpaket: 0 }
  );

  return { n, days, rows, totals, board, assumedBoard, reqs };
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
    `Verpflegung: ${plan.board}${plan.assumedBoard ? " (angenommen)" : " (aus Anfrage)"}`,
    plan.reqs.raw ? `Anforderungen aus der Anfrage: ${plan.reqs.raw}` : null,
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
