"use client";
// components/Charts.js — schlanke SVG-Charts ohne externe Abhängigkeit,
// im Don-Bosco-Look (Markenfarbe Burgund). Donut mit Hover-Info.
import { useState } from "react";

const TONE = {
  info: "var(--db-info)",
  warn: "var(--db-warn)",
  success: "var(--db-success)",
  primary: "var(--db-primary)",
  neutral: "var(--db-line-strong)",
};

// Donut-/Ring-Diagramm mit Hover: beim Überfahren eines Segments erscheint ein
// Tooltip (Label · Wert · %), das aktive Segment bleibt voll, die übrigen dimmen.
export function Donut({ segments = [], total, centerValue, centerLabel, size = 184 }) {
  const [hover, setHover] = useState(null);
  const sum = total ?? segments.reduce((s, x) => s + x.value, 0);
  const stroke = 30;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const active = hover != null ? segments[hover] : null;
  let offset = 0; // Dash-Position der Arcs

  return (
    <div className="donut-box" style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
        <g transform={`translate(${cx} ${cy}) rotate(-90)`}>
          <circle r={r} fill="none" stroke="var(--db-line)" strokeWidth={stroke} />
          {sum > 0 &&
            segments.map((s, i) => {
              const len = (s.value / sum) * c;
              const dim = hover != null && hover !== i;
              const el = (
                <circle
                  key={i}
                  r={r}
                  fill="none"
                  stroke={TONE[s.tone] || TONE.neutral}
                  strokeWidth={hover === i ? stroke + 4 : stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  opacity={dim ? 0.4 : 1}
                  style={{ transition: "opacity .12s, stroke-width .12s", cursor: "pointer" }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              );
              offset += len;
              return el;
            })}
        </g>
        <text x="50%" y="45%" textAnchor="middle" className="donut-num">
          {active ? active.value : centerValue ?? sum}
        </text>
        <text x="50%" y="58%" textAnchor="middle" className="donut-cap">
          {active ? active.label : centerLabel || ""}
        </text>
      </svg>
    </div>
  );
}

// Glatte Kurve OHNE Überschwingen (monotone Kubik, Fritsch-Carlson). Wichtig
// bei spitzen Tagesdaten (0,0,3,0…): Catmull-Rom würde über-/unterschwingen und
// oben/unten abgeschnitten werden. Monoton bleibt strikt im Datenbereich.
function smoothPath(ps) {
  const n = ps.length;
  if (n < 2) return n ? `M ${ps[0].x.toFixed(1)} ${ps[0].y.toFixed(1)}` : "";
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = ps[i + 1].x - ps[i].x;
    dy[i] = ps[i + 1].y - ps[i].y;
    m[i] = dx[i] ? dy[i] / dx[i] : 0;
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = Math.hypot(a, b);
    if (h > 3) { const s = 3 / h; t[i] = s * a * m[i]; t[i + 1] = s * b * m[i]; }
  }
  let d = `M ${ps[0].x.toFixed(1)} ${ps[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const x1 = ps[i].x + dx[i] / 3, y1 = ps[i].y + (t[i] * dx[i]) / 3;
    const x2 = ps[i + 1].x - dx[i] / 3, y2 = ps[i + 1].y - (t[i + 1] * dx[i]) / 3;
    d += ` C ${x1.toFixed(1)} ${y1.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}, ${ps[i + 1].x.toFixed(1)} ${ps[i + 1].y.toFixed(1)}`;
  }
  return d;
}

// Area-/Linien-Chart: glatte Burgund-Kurve + Verlaufsfüllung + Punkte (letzter
// Punkt gefüllt = „aktuell"), wie in der Referenz, nur in der ZUK-Palette.
export function AreaLine({ points = [], height = 150 }) {
  const W = 600;
  const H = height;
  const pad = { t: 14, r: 10, b: 6, l: 10 };
  const max = Math.max(1, ...points.map((p) => p.n));
  const n = points.length;
  const X = (i) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, n - 1);
  const Y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const pts = points.map((p, i) => ({ x: X(i), y: Y(p.n) }));
  const line = smoothPath(pts);
  const area = pts.length
    ? `${line} L ${pts[n - 1].x.toFixed(1)} ${H - pad.b} L ${pts[0].x.toFixed(1)} ${H - pad.b} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="areachart" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--db-primary)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--db-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--db-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {pts.map((p, i) => {
        const last = i === n - 1;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={last ? 3.6 : 2.8}
            fill={last ? "var(--db-primary)" : "var(--db-paper)"}
            stroke="var(--db-primary)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
