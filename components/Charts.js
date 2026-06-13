// components/Charts.js — schlanke SVG-Charts ohne externe Abhängigkeit,
// im Don-Bosco-Look. Rein darstellend (server-renderbar).

const TONE = {
  info: "var(--db-info)",
  warn: "var(--db-warn)",
  success: "var(--db-success)",
  primary: "var(--db-primary)",
  neutral: "var(--db-line-strong)",
};

// Donut-/Ring-Diagramm. `segments` = [{ value, tone, label }].
export function Donut({ segments = [], total, centerValue, centerLabel, size = 180 }) {
  const sum = total ?? segments.reduce((s, x) => s + x.value, 0);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
      <g transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
        <circle r={r} fill="none" stroke="var(--db-line)" strokeWidth={stroke} />
        {sum > 0 &&
          segments.map((s, i) => {
            const len = (s.value / sum) * c;
            const el = (
              <circle
                key={i}
                r={r}
                fill="none"
                stroke={TONE[s.tone] || TONE.neutral}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </g>
      <text x="50%" y="47%" textAnchor="middle" className="donut-num">
        {centerValue ?? sum}
      </text>
      <text x="50%" y="59%" textAnchor="middle" className="donut-cap">
        {centerLabel || ""}
      </text>
    </svg>
  );
}

// Area-/Linien-Chart. `points` = [{ label, n }].
export function AreaLine({ points = [], height = 150 }) {
  const W = 600;
  const H = height;
  const pad = { t: 12, r: 8, b: 4, l: 8 };
  const max = Math.max(1, ...points.map((p) => p.n));
  const n = points.length;
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, n - 1);
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.n).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H - pad.b} L ${x(0).toFixed(1)} ${H - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="areachart" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--db-primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--db-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="var(--db-primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.n)} r="2.5" fill="var(--db-primary)" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
