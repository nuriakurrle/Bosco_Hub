"use client";
// components/HighlightEmail.js — markiert im Original-E-Mail-Text die Stellen,
// die der Agent als Felder extrahiert hat (mit Farbe pro Feldtyp + Tooltip).
// So sieht das Team auf einen Blick, WOHER jeder erkannte Wert stammt.
// Interview (Niklas): "highlighting the important information ... and it suggests".

// Feldtyp → Highlight-Klasse + Anzeigename im Tooltip.
const FIELD_HL = {
  school_name: { cls: "hl-who", label: "Gruppe / Schule" },
  contact_person: { cls: "hl-who", label: "Kontakt" },
  date_range: { cls: "hl-date", label: "Zeitraum" },
  number_of_people: { cls: "hl-people", label: "Personen" },
  program_type: { cls: "hl-prog", label: "Art / Programm" },
  grade_level: { cls: "hl-prog", label: "Jahrgangsstufe" },
  house: { cls: "hl-prog", label: "Haus" },
  special_requirements: { cls: "hl-extra", label: "Besonderes" },
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Baut die Liste der "Nadeln" (zu markierende Strings) aus den Feldern + ein paar
// robusten Ableitungen (Datums-Token, führende Personenzahl), damit auch dann
// etwas markiert wird, wenn der Feldwert nicht 1:1 im Text steht.
function buildNeedles(fields) {
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
      // markante ersten zwei Wörter zusätzlich (z. B. "Realschule Bruckmühl")
      const head = f.value.split(/\s+/).slice(0, 2).join(" ");
      if (head !== f.value) add(head, meta.cls, meta.label, f.key);
    }
  }
  return needles;
}

// Findet im Text auch deutsche Datumsangaben wie "15.–17. Februar 2026".
const GERMAN_DATE_RE =
  /\b\d{1,2}\.\s*(?:bis|–|-)\s*\d{1,2}\.?\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)(?:\s*\d{4})?/gi;

export default function HighlightEmail({ body, fields = [], activeKey = null, onMarkHover }) {
  if (!body) return null;
  const ranges = [];

  // 1) Feld-Nadeln (längste zuerst, damit "Realschule Bruckmühl" vor "Realschule" greift)
  const needles = buildNeedles(fields).sort((a, b) => b.text.length - a.text.length);
  for (const n of needles) {
    const re = new RegExp(escapeRe(n.text), "gi");
    let m;
    while ((m = re.exec(body))) {
      ranges.push({ start: m.index, end: m.index + m[0].length, cls: n.cls, label: n.label, key: n.key });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  // 2) generische deutsche Datumsangaben
  let dm;
  while ((dm = GERMAN_DATE_RE.exec(body))) {
    ranges.push({ start: dm.index, end: dm.index + dm[0].length, cls: "hl-date", label: "Zeitraum", key: "date_range" });
  }

  // Überlappungen auflösen: nach Start sortieren, längere zuerst, Überlappendes verwerfen.
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  let lastEnd = -1;
  for (const r of ranges) {
    if (r.start >= lastEnd) {
      kept.push(r);
      lastEnd = r.end;
    }
  }

  // Knoten bauen (Text + <mark>), Zeilenumbrüche via pre-wrap erhalten.
  const nodes = [];
  let cursor = 0;
  kept.forEach((r, i) => {
    if (r.start > cursor) nodes.push(body.slice(cursor, r.start));
    const isActive = activeKey && r.key === activeKey;
    nodes.push(
      <mark
        key={i}
        data-key={r.key}
        className={`hl ${r.cls}${isActive ? " active" : ""}`}
        title={`Erkannt als: ${r.label}`}
      >
        {body.slice(r.start, r.end)}
      </mark>
    );
    cursor = r.end;
  });
  if (cursor < body.length) nodes.push(body.slice(cursor));

  // Hover über eine Markierung meldet das zugehörige Feld nach oben (Feld↔Text).
  const handleOver = (e) => {
    const k = e.target?.closest?.("mark[data-key]")?.dataset.key;
    if (k && onMarkHover) onMarkHover(k);
  };
  const handleLeave = () => onMarkHover && onMarkHover(null);

  return (
    <div className="db-email-hl" onMouseOver={onMarkHover ? handleOver : undefined} onMouseLeave={onMarkHover ? handleLeave : undefined}>
      {nodes}
    </div>
  );
}
