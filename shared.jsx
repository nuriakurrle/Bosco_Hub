// shared.jsx — Don Bosco shared components, icons, sample data
// Exposed on window for cross-file use.

// ─────────────────────────────────────────────────────────────
// Icons (simple, hand-drawn-stroke, single-color via currentColor)
// ─────────────────────────────────────────────────────────────
const Icon = ({ d, size = 14, stroke = 1.6, fill = "none", style }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const I = {
  inbox:   "M3 13l3-8h12l3 8M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6M3 13h5l1 3h6l1-3h5",
  mail:    "M4 6h16v12H4zM4 6l8 7 8-7",
  search:  ["M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM16 16l5 5"],
  alert:   ["M12 3l10 17H2L12 3z", "M12 10v5", "M12 18.5v.01"],
  check:   "M5 12l5 5 9-10",
  x:       "M6 6l12 12M18 6L6 18",
  clock:   ["M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z", "M12 7v5l3.5 2"],
  house:   "M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10z",
  users:   ["M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M2 21a7 7 0 0 1 14 0", "M14 21h8a5 5 0 0 0-5-5"],
  doc:     ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5z", "M14 3v5h5", "M9 13h6M9 17h6"],
  bell:    ["M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2z", "M10 21a2 2 0 0 0 4 0"],
  shield:  "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  link:    ["M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1", "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"],
  filter:  "M4 5h16l-6 8v6l-4-2v-4L4 5z",
  bed:     ["M3 18V8h7a4 4 0 0 1 4 4v2h7v4", "M3 18h18", "M7 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  refresh: ["M21 12a9 9 0 1 1-3-6.7", "M21 4v5h-5"],
  more:    "M5 12h.01M12 12h.01M19 12h.01",
  chevron: "M9 6l6 6-6 6",
  chevDown:"M6 9l6 6 6-6",
  attach:  "M21 11l-9 9a5 5 0 1 1-7-7l9-9a3 3 0 1 1 4 4l-9 9a1 1 0 1 1-2-2l8-8",
  send:    "M4 12l16-8-4 16-4-6-8-2z",
  pencil:  ["M4 20h4l10-10-4-4L4 16v4z", "M14 6l4 4"],
  spark:   "M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z",
  euro:    ["M19 5a8 8 0 1 0 0 14", "M4 10h10M4 14h10"],
  arrowRight: "M5 12h14M13 6l6 6-6 6",
};

// ─────────────────────────────────────────────────────────────
// Common UI
// ─────────────────────────────────────────────────────────────
function Pill({ tone = "neutral", children, dot = true }) {
  return (
    <span className={`db-pill db-pill-${tone}`}>
      {dot && <span className="db-pill-dot" />}
      {children}
    </span>
  );
}

function Btn({ kind = "secondary", size, icon, iconR, children, ...rest }) {
  const cls = ["db-btn", `db-btn-${kind}`, size === "sm" && "db-btn-sm"].filter(Boolean).join(" ");
  return (
    <button className={cls} {...rest}>
      {icon && <Icon d={I[icon]} size={size === "sm" ? 12 : 14} />}
      {children}
      {iconR && <Icon d={I[iconR]} size={size === "sm" ? 12 : 14} />}
    </button>
  );
}

function Card({ title, kicker, action, children, soft, flat, style, bodyStyle, noBody }) {
  const cls = soft ? "db-card-soft" : flat ? "db-card-flat" : "db-card";
  return (
    <div className={cls} style={style}>
      {title && (
        <div className="db-card-header">
          <div className="db-card-title">{title}</div>
          {kicker && <span className="mono" style={{ fontSize: 11, color: "var(--db-text-faint)" }}>{kicker}</span>}
          <div style={{ marginLeft: "auto" }}>{action}</div>
        </div>
      )}
      {!noBody && <div className="db-card-body" style={bodyStyle}>{children}</div>}
      {noBody && children}
    </div>
  );
}

function CapBar({ used, total, label }) {
  const pct = Math.round((used / total) * 100);
  const tone = pct >= 95 ? "full" : pct >= 80 ? "warn" : "";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11.5 }}>
        <span style={{ color: "var(--db-text-muted)" }}>{label}</span>
        <span className="mono" style={{ fontWeight: 600 }}>
          {used}<span style={{ color: "var(--db-text-faint)" }}>/{total}</span>
        </span>
      </div>
      <div className="cap-bar"><span className={tone} style={{ width: pct + "%" }} /></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sample data — realistic German youth-group bookings, May 2026
// ─────────────────────────────────────────────────────────────
const HOUSES = [
  { id: "ben",  name: "Haus Benediktbeuern", short: "BEN", capacity: 82, used: 64 },
  { id: "jue",  name: "Haus Jünkerath",      short: "JÜN", capacity: 60, used: 51 },
  { id: "ens",  name: "Haus Ensdorf",        short: "ENS", capacity: 45, used: 18 },
];

const REQUESTS = [
  {
    id: "AB-2026-0412",
    from: "Pfarrjugend St. Michael, Augsburg",
    contact: "Lukas Brunner",
    email: "l.brunner@pfarrei-st-michael-augsburg.de",
    received: "vor 14 Min.",
    receivedAbs: "27.05.2026 · 09:46",
    status: "missing",
    statusLabel: "Daten unvollständig",
    house: "Haus Benediktbeuern",
    arrival: "12.07.2026",
    nights: 5,
    persons: 28,
    program: "Sommerfreizeit",
    flags: ["dup", "missing"],
    completion: 78,
    subject: "Anfrage Sommerfreizeit 12.–17. Juli",
  },
  {
    id: "AB-2026-0411",
    from: "KJG Sankt Anna, Regensburg",
    contact: "Theresa Aigner",
    email: "vorstand@kjg-st-anna.de",
    received: "vor 38 Min.",
    receivedAbs: "27.05.2026 · 09:22",
    status: "ready",
    statusLabel: "Bereit zur Freigabe",
    house: "Haus Jünkerath",
    arrival: "03.08.2026",
    nights: 4,
    persons: 22,
    program: "Gruppenleiter-Schulung",
    flags: ["approval"],
    completion: 100,
    subject: "Schulungswochenende August",
  },
  {
    id: "AB-2026-0410",
    from: "DPSG Stamm Wolfsburg",
    contact: "Jonas Möller",
    email: "kontakt@dpsg-wolfsburg.de",
    received: "vor 1 Std.",
    receivedAbs: "27.05.2026 · 09:01",
    status: "duplicate",
    statusLabel: "Mögliches Duplikat",
    house: "Haus Ensdorf",
    arrival: "21.09.2026",
    nights: 3,
    persons: 34,
    program: "Herbstlager",
    flags: ["dup"],
    completion: 92,
    subject: "Herbstlager September – Folgenachricht",
  },
  {
    id: "AB-2026-0409",
    from: "Ministranten St. Josef, Passau",
    contact: "Pfr. Andreas Huber",
    email: "pfarrbuero@st-josef-passau.de",
    received: "vor 2 Std.",
    receivedAbs: "27.05.2026 · 08:11",
    status: "feasible",
    statusLabel: "Programm prüfen",
    house: "Haus Benediktbeuern",
    arrival: "29.06.2026",
    nights: 2,
    persons: 16,
    program: "Wochenend-Einkehrtage",
    flags: ["feasibility"],
    completion: 88,
    subject: "Einkehrtage Ministranten",
  },
  {
    id: "AB-2026-0408",
    from: "Firmlinge Mariä Himmelfahrt, Landshut",
    contact: "Carolin Engel",
    email: "firmkurs@maria-himmelfahrt-la.de",
    received: "gestern",
    receivedAbs: "26.05.2026 · 17:34",
    status: "contract",
    statusLabel: "Vertragsentwurf",
    house: "Haus Jünkerath",
    arrival: "10.10.2026",
    nights: 2,
    persons: 19,
    program: "Firmwochenende",
    flags: ["contract"],
    completion: 100,
    subject: "Firmwochenende Oktober – Vertragsentwurf",
  },
  {
    id: "AB-2026-0407",
    from: "Jugend St. Korbinian, Freising",
    contact: "Mathias Lechner",
    email: "jugend@st-korbinian-fs.de",
    received: "gestern",
    receivedAbs: "26.05.2026 · 14:02",
    status: "reminder",
    statusLabel: "Erinnerung gesendet",
    house: "Haus Benediktbeuern",
    arrival: "05.07.2026",
    nights: 6,
    persons: 41,
    program: "Sommerlager",
    flags: ["reminder"],
    completion: 70,
    subject: "Re: Anfrage Sommerlager – Rückmeldung erbeten",
  },
  {
    id: "AB-2026-0406",
    from: "BDKJ Diözesanverband Eichstätt",
    contact: "Lisa Stadler",
    email: "stadler@bdkj-eichstaett.de",
    received: "vor 2 Tagen",
    receivedAbs: "25.05.2026 · 11:50",
    status: "watchdog",
    statusLabel: "Watchdog: Risiko",
    house: "Haus Ensdorf",
    arrival: "07.06.2026",
    nights: 3,
    persons: 25,
    program: "Vorstandsklausur",
    flags: ["watchdog"],
    completion: 95,
    subject: "Klausurwochenende – T-11 Tage",
  },
];

const STATUS_TONE = {
  missing: "warn",
  ready: "success",
  duplicate: "info",
  feasible: "burgundy",
  contract: "burgundy",
  reminder: "neutral",
  watchdog: "error",
};

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────
Object.assign(window, {
  Icon, I, Pill, Btn, Card, CapBar,
  HOUSES, REQUESTS, STATUS_TONE,
});
