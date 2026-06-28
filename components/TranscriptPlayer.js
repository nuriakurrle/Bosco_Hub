"use client";
// components/TranscriptPlayer.js — Telefon-Transkript-Ansicht.
// Zeigt das gespeicherte Gesprächstranskript nach Sprecher:in getrennt (Büro /
// Anrufer:in) mit farbig markierten, automatisch erkannten Angaben.
//
// WICHTIG (DSGVO): Das Audio der Anrufe wird bewusst NICHT gespeichert
// (Datenminimierung, Art. 9 — Gesundheits-/Allergieangaben). Es gibt also keine
// Aufnahme zum Abspielen — nur das Transkript ist echt und persistiert.
import { useMemo } from "react";
import { findMarkRanges } from "@/lib/highlight";

function speakerSide(raw) {
  const s = (raw || "").toLowerCase();
  if (s === "db" || s.includes("büro") || s.includes("buchung")) return { side: "staff", label: "DB" };
  if (s.startsWith("anrufer")) return { side: "caller", label: "Anrufer" };
  return { side: "caller", label: raw };
}

// Flaches Transkript in Sprecher-Segmente zerlegen (anhand "DB:"/"Anrufer:"-Marken).
function parseSegments(text) {
  const re = /(DB|Anrufer(?:in)?|Herr\s[A-ZÄÖÜ][\wäöüß-]+|Frau\s[A-ZÄÖÜ][\wäöüß-]+):\s*/g;
  const matches = [...text.matchAll(re)];
  const raw = [];
  if (!matches.length) {
    raw.push({ speaker: null, text: text.trim() });
  } else {
    const pre = text.slice(0, matches[0].index).trim();
    if (pre) raw.push({ speaker: null, text: pre });
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const seg = text.slice(start, end).trim();
      if (seg) raw.push({ speaker: matches[i][1], text: seg });
    }
  }
  return raw;
}

// Text mit denselben farbcodierten Markierungen wie die E-Mail-Ansicht rendern
// (gleiche hl-*-Klassen, gleiche Logik via findMarkRanges → einheitliche Farben).
function renderMarked(text, fields) {
  const kept = findMarkRanges(text, fields);
  if (!kept.length) return text;
  const out = [];
  let cursor = 0;
  kept.forEach((r, i) => {
    if (r.start > cursor) out.push(text.slice(cursor, r.start));
    out.push(
      <mark key={i} className={`hl ${r.cls}`} title={`Erkannt als: ${r.label}`}>
        {text.slice(r.start, r.end)}
      </mark>
    );
    cursor = r.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export default function TranscriptPlayer({ text, fields = [] }) {
  const segments = useMemo(() => parseSegments(text), [text]);
  // Nur erkannte (nicht fehlende) Felder markieren; Farben/Logik aus lib/highlight.
  const markFields = useMemo(() => fields.filter((f) => f.status !== "missing"), [fields]);

  return (
    <div className="call-src">
      <div className="db-faint" style={{ fontSize: 11, margin: "0 2px 10px", fontFamily: "var(--db-font-mono)" }}>
        Auto-Transkription · Deutsch · farbig markiert = automatisch erkannt · Audio wird aus Datenschutzgründen nicht gespeichert
      </div>

      <div className="transcript">
        {segments.map((s, i) => {
          const sp = s.speaker ? speakerSide(s.speaker) : null;
          return (
            <div key={i} className="tr-seg">
              {sp && (
                <div className="tr-meta">
                  <div className={`tr-spk ${sp.side}`}>{sp.label}</div>
                </div>
              )}
              <div className="tr-text">{renderMarked(s.text, markFields)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
