"use client";
// components/TranscriptPlayer.js — Telefon-Transkript wie im Intake-Prototyp:
// Waveform-Player + Zeitstempel-Segmente je Sprecher (Büro / Anrufer:in), mit
// gelb markierten, automatisch erkannten Angaben. Da der Prototyp (noch) keine
// echten Audiodateien hat, werden Zeitstempel aus der Wortmenge geschätzt und
// die Wiedergabe simuliert; echte Audiozeit kann das später ersetzen (n8n).
import { useEffect, useMemo, useRef, useState } from "react";
import { findMarkRanges } from "@/lib/highlight";

const WORD_SEC = 0.36; // geschätzte Sprechdauer je Wort

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function speakerSide(raw) {
  const s = (raw || "").toLowerCase();
  if (s === "db" || s.includes("büro") || s.includes("buchung")) return { side: "staff", label: "DB" };
  if (s.startsWith("anrufer")) return { side: "caller", label: "Anrufer" };
  return { side: "caller", label: raw };
}

// Flaches Transkript in Sprecher-Segmente mit geschätztem Zeitstempel zerlegen.
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
  let acc = 0;
  return raw.map((s) => {
    const t = acc * WORD_SEC;
    acc += (s.text.match(/\S+/g) || []).length;
    return { ...s, t };
  });
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
  const totalWords = useMemo(() => (text.match(/\S+/g) || []).length, [text]);
  const dur = Math.max(1, totalWords * WORD_SEC);

  // Nur erkannte (nicht fehlende) Felder markieren; Farben/Logik aus lib/highlight.
  const markFields = useMemo(() => fields.filter((f) => f.status !== "missing"), [fields]);

  const wave = useMemo(
    () => Array.from({ length: 56 }, (_, i) => 5 + Math.round(13 * Math.abs(Math.sin(i * 0.6) * Math.cos(i * 0.31)))),
    [text]
  );

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const curRef = useRef(null);

  useEffect(() => {
    if (!playing) return undefined;
    const iv = setInterval(() => setTime((t) => { if (t >= dur) { setPlaying(false); return dur; } return t + 0.4; }), 200);
    return () => clearInterval(iv);
  }, [playing, dur]);

  let curIdx = 0;
  segments.forEach((s, i) => { if (s.t <= time) curIdx = i; });

  useEffect(() => {
    if (playing && curRef.current) curRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [curIdx, playing]);

  return (
    <div className="call-src">
      <div className="audio-player">
        <button className="audio-play-btn" onClick={() => { if (time >= dur) setTime(0); setPlaying((p) => !p); }} title={playing ? "Pause" : "Abspielen"}>
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z" /></svg>
          )}
        </button>
        <div
          className="waveform"
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTime(Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur))); }}
        >
          {wave.map((h, i) => {
            const barT = (i / wave.length) * dur;
            return <span key={i} className={`bar ${barT <= time ? "played" : ""}`} style={{ height: h * 1.6 }} />;
          })}
        </div>
        <span className="audio-time">{fmt(time)} / {fmt(dur)}</span>
      </div>
      <div className="db-faint" style={{ fontSize: 11, margin: "8px 2px 10px", fontFamily: "var(--db-font-mono)" }}>
        Auto-Transkription · Deutsch · farbig markiert = automatisch erkannt · simulierte Wiedergabe
      </div>

      <div className="transcript">
        {segments.map((s, i) => {
          const sp = s.speaker ? speakerSide(s.speaker) : null;
          return (
            <div
              key={i}
              ref={i === curIdx ? curRef : null}
              className={`tr-seg ${i === curIdx ? "current" : ""}`}
              onClick={() => { setTime(s.t); setPlaying(false); }}
            >
              <div className="tr-meta">
                <div className="tr-time">{fmt(s.t)}</div>
                {sp && <div className={`tr-spk ${sp.side}`}>{sp.label}</div>}
              </div>
              <div className="tr-text">{renderMarked(s.text, markFields)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
