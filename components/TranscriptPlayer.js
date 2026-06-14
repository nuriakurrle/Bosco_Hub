"use client";
// components/TranscriptPlayer.js — Telefon-Transkript wie im Intake-Prototyp:
// Waveform-Player + Zeitstempel-Segmente je Sprecher (Büro / Anrufer:in), mit
// gelb markierten, automatisch erkannten Angaben. Da der Prototyp (noch) keine
// echten Audiodateien hat, werden Zeitstempel aus der Wortmenge geschätzt und
// die Wiedergabe simuliert; echte Audiozeit kann das später ersetzen (n8n).
import { useEffect, useMemo, useRef, useState } from "react";

const WORD_SEC = 0.36; // geschätzte Sprechdauer je Wort
const MARK_KEYS = new Set(["contact_person", "school_name", "date_range", "number_of_people", "program_type", "house", "grade_level"]);

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

// Wort-Zeichen inkl. deutscher Umlaute (für Wortgrenzen; \b ist nur ASCII).
const WORD = "A-Za-zÄÖÜäöüß0-9_";

// Einen Suchwert escapen und an Wort-Rändern mit Grenzen versehen, damit z. B.
// "10" nicht innerhalb von "100" markiert wird (nur wo der Rand ein Wort-Zeichen ist).
function boundedPattern(v) {
  const esc = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const left = new RegExp(`^[${WORD}]`).test(v) ? `(?<![${WORD}])` : "";
  const right = new RegExp(`[${WORD}]$`).test(v) ? `(?![${WORD}])` : "";
  return left + esc + right;
}

// Text mit gelben Markierungen für automatisch erkannte Angaben rendern.
function renderMarked(text, values) {
  if (!values.length) return text;
  const esc = [...values].sort((a, b) => b.length - a.length).map(boundedPattern);
  const re = new RegExp(`(${esc.join("|")})`, "gi");
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<span key={m.index} className="tr-mark">{m[0]}</span>);
    last = m.index + m[0].length;
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function TranscriptPlayer({ text, fields = [] }) {
  const segments = useMemo(() => parseSegments(text), [text]);
  const totalWords = useMemo(() => (text.match(/\S+/g) || []).length, [text]);
  const dur = Math.max(1, totalWords * WORD_SEC);

  const markValues = useMemo(
    () =>
      fields
        .filter((f) => MARK_KEYS.has(f.key) && f.status !== "missing" && f.value && f.value.length >= 2 && f.value.length <= 40)
        .map((f) => f.value),
    [fields]
  );

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
      <div className="db-faint" style={{ fontSize: 10.5, margin: "8px 2px 10px", fontFamily: "var(--db-font-mono)" }}>
        Auto-Transkription · Deutsch · gelb = automatisch erkannt · simulierte Wiedergabe
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
              <div className="tr-text">{renderMarked(s.text, markValues)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
