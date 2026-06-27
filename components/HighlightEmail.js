"use client";
// components/HighlightEmail.js — markiert im Original-E-Mail-Text die Stellen,
// die der Agent als Felder extrahiert hat (mit Farbe pro Feldtyp + Tooltip).
// So sieht das Team auf einen Blick, WOHER jeder erkannte Wert stammt.
// Interview (Niklas): "highlighting the important information ... and it suggests".

import { findMarkRanges } from "@/lib/highlight";

export default function HighlightEmail({ body, fields = [], activeKey = null, onMarkHover }) {
  if (!body) return null;

  // Eine Quelle für die zu markierenden Bereiche (identisch zur Telefon-Ansicht).
  const kept = findMarkRanges(body, fields);

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
