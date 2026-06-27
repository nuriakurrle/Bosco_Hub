// lib/highlight.js — gemeinsame Quelle dafür, WELCHE Stellen im Quelltext als
// erkannte Felder markiert werden. Damit heben E-Mail (HighlightEmail) UND
// Telefon-Transkript (TranscriptPlayer) dieselben wichtigen Infos hervor —
// vorher hatte Telefon eine engere Logik und ließ z. B. „Besonderes" weg.

// Feldtyp → Highlight-Klasse (Farbe) + Anzeigename im Tooltip.
export const FIELD_HL = {
  school_name: { cls: "hl-who", label: "Gruppe / Schule" },
  contact_person: { cls: "hl-who", label: "Kontakt" },
  date_range: { cls: "hl-date", label: "Zeitraum" },
  number_of_people: { cls: "hl-people", label: "Personen" },
  program_type: { cls: "hl-prog", label: "Art / Programm" },
  grade_level: { cls: "hl-prog", label: "Jahrgangsstufe" },
  house: { cls: "hl-prog", label: "Haus" },
  special_requirements: { cls: "hl-extra", label: "Besonderes" },
};

export function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Deutsche Datumsangaben wie „15.–17. Februar 2026". Als Quelle gehalten, damit
// jeder Aufrufer sein EIGENES Regex baut (kein geteilter lastIndex-Zustand).
export const GERMAN_DATE_SOURCE =
  "\\b\\d{1,2}\\.\\s*(?:bis|–|-)\\s*\\d{1,2}\\.?\\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)(?:\\s*\\d{4})?";

export function germanDateRe() {
  return new RegExp(GERMAN_DATE_SOURCE, "gi");
}

// Baut die Liste der „Nadeln" (zu markierende Strings) aus den Feldern + ein paar
// robusten Ableitungen (Datums-Token, führende Personenzahl, Schul-Kopf), damit
// auch dann etwas markiert wird, wenn der Feldwert nicht 1:1 im Text steht.
export function buildNeedles(fields = []) {
  const needles = [];
  const add = (text, cls, label, key) => {
    const t = (text || "").trim();
    if (t.length >= 2) needles.push({ text: t, cls, label, key });
  };

  for (const f of fields) {
    const meta = FIELD_HL[f.key];
    if (!meta || !f.value) continue;
    add(f.value, meta.cls, meta.label, f.key);

    if (f.key === "number_of_people") {
      const n = String(f.value).match(/\d+/);
      if (n) add(n[0], meta.cls, meta.label, f.key);
    }
    if (f.key === "date_range") {
      for (const m of String(f.value).matchAll(/\d{1,2}\.\d{1,2}\.\d{4}/g)) add(m[0], meta.cls, meta.label, f.key);
    }
    if (f.key === "school_name") {
      // markante erste zwei Wörter zusätzlich (z. B. „Realschule Bruckmühl")
      const head = String(f.value).split(/\s+/).slice(0, 2).join(" ");
      if (head !== f.value) add(head, meta.cls, meta.label, f.key);
    }
  }
  return needles;
}

// Wort-Zeichen inkl. deutscher Umlaute (für Wortgrenzen; \b ist nur ASCII).
const WORD = "A-Za-zÄÖÜäöüß0-9_";

// Escapen + an Wort-Rändern Grenzen setzen, damit z. B. „10" nicht innerhalb von
// „100" markiert wird (nur wo der Rand ein Wort-Zeichen ist).
export function boundedPattern(v) {
  const esc = escapeRe(v);
  const left = new RegExp(`^[${WORD}]`).test(v) ? `(?<![${WORD}])` : "";
  const right = new RegExp(`[${WORD}]$`).test(v) ? `(?![${WORD}])` : "";
  return left + esc + right;
}

// EINE Quelle für „welche Stellen im Text werden wie eingefärbt": liefert
// sortierte, überlappungsfreie Bereiche {start,end,cls,label,key}. Genutzt von
// E-Mail- UND Telefon-Ansicht, damit beide identische Farben/Logik verwenden.
export function findMarkRanges(text, fields = []) {
  if (!text) return [];
  const ranges = [];
  // 1) Feld-Nadeln (längste zuerst, damit „Realschule Bruckmühl" vor „Realschule" greift)
  const needles = buildNeedles(fields).sort((a, b) => b.text.length - a.text.length);
  for (const n of needles) {
    const re = new RegExp(boundedPattern(n.text), "gi");
    let m;
    while ((m = re.exec(text))) {
      ranges.push({ start: m.index, end: m.index + m[0].length, cls: n.cls, label: n.label, key: n.key });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  // 2) generische deutsche Datumsangaben
  const gdr = germanDateRe();
  let dm;
  while ((dm = gdr.exec(text))) {
    ranges.push({ start: dm.index, end: dm.index + dm[0].length, cls: "hl-date", label: "Zeitraum", key: "date_range" });
  }
  // Überlappungen auflösen: nach Start sortieren, längere zuerst, Überlappendes verwerfen.
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  let lastEnd = -1;
  for (const r of ranges) {
    if (r.start >= lastEnd) { kept.push(r); lastEnd = r.end; }
  }
  return kept;
}
