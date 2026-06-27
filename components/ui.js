// components/ui.js — Reusable UI components (ported from shared.jsx).
import { Icon, I } from "@/components/icons";
import { areaColor, areaLabel } from "@/lib/team";

// ── Badge-Taxonomie (Aufgabe 2) ──────────────────────────────────────────
// 1) <Pill>        — Status/Lifecycle (Neu, Info fehlt, Gebucht, Reserviert,
//                    Bestätigt): soft-filled in Semantik-Farbe.
// 2) <ContractBadge> — Vertragsstatus: BEWUSST anderer Sub-Stil (Outline + Icon),
//                    damit es sich nicht mit dem Buchungsstatus verwechseln lässt.
// 3) <HouseTag>    — Haus: Punkt + Label in Hausfarbe (eine Quelle: team.js).
// 4) <CountBadge>  — neutraler Zähler-Chip.

export function Pill({ tone = "neutral", children, dot = true }) {
  return (
    <span className={`db-pill db-pill-${tone}`}>
      {dot && <span className="db-pill-dot" />}
      {children}
    </span>
  );
}

// Vertragsstatus — eine Quelle für die Lifecycle-Labels + der distinkte Stil.
const CONTRACT_BADGE = {
  draft: { label: "Entwurf nötig", tone: "warn", icon: "doc" },
  sent: { label: "Versendet", tone: "info", icon: "send" },
  signed: { label: "Bestätigt", tone: "success", icon: "check" },
  overdue: { label: "Überfällig", tone: "error", icon: "alert" },
};
export function ContractBadge({ status = "draft", label, prefix = false }) {
  const m = CONTRACT_BADGE[status] || CONTRACT_BADGE.draft;
  return (
    <span className={`contract-badge t-${m.tone}`}>
      <Icon d={I[m.icon]} size={11} />
      {label || (prefix ? `Vertrag: ${m.label}` : m.label)}
    </span>
  );
}

// Haus-Tag: Punkt + Label in Hausfarbe — ersetzt verstreute route-chip-Varianten.
export function HouseTag({ area, label, title }) {
  const text = label || areaLabel(area);
  return (
    <span className="house-tag" title={title || text}>
      <span className="house-tag-dot" style={{ background: areaColor(area) }} />
      {text}
    </span>
  );
}

// Neutraler Zähler-Chip („Alle E-Mails 10").
export function CountBadge({ children }) {
  return <span className="count-badge">{children}</span>;
}

// Einheitliche KPI-Karte für alle Seiten (Übersicht, Buchungen, Verträge):
// heller Hintergrund, farbiger Linksbalken, kleines Icon + Label, große Zahl.
const STAT_INK = {
  info: "var(--db-info)",
  warn: "var(--db-warn)",
  success: "var(--db-success)",
  primary: "var(--db-primary)",
  error: "var(--db-error)",
  neutral: "var(--db-text-muted)",
};
// Mini-Sparkline für KPI-Karten (echte Tagesreihe; nur wo vorhanden).
function Sparkline({ data }) {
  const w = 100, h = 20;
  const max = Math.max(1, ...data);
  const n = data.length;
  const pts = data.map((v, i) => `${((i / (n - 1)) * w).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`).join(" ");
  return (
    <svg className="stat-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--stat-ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatCard({ tone = "info", icon, label, value, sub, delta, deltaLabel = "ggü. Vorwoche", onClick, active = false, hero = false, arrow = false, spark }) {
  return (
    <div
      className={`stat-card${active ? " active" : ""}${hero ? " stat-card-hero" : ""}${onClick ? " is-clickable" : ""}`}
      style={{ "--stat-ink": STAT_INK[tone] || STAT_INK.info }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="stat-head">
        {icon && <span className="stat-ico"><Icon d={I[icon]} size={14} /></span>}
        <span className="stat-label">{label}</span>
        {arrow && <span className="stat-arrow"><Icon d={I.arrowUpRight} size={14} /></span>}
      </div>
      <div className="stat-value">{value}</div>
      {spark && spark.length > 1 && spark.some((v) => v > 0) && <Sparkline data={spark} />}
      {/* Trend ist bewusst neutral (Pfeil + Zahl), nicht grün/rot — mehr Anfragen
          ist je nach KPI weder gut noch schlecht, nur eine Richtung. */}
      {delta != null && delta !== 0 && (
        <div className="stat-delta">
          {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} {deltaLabel}
        </div>
      )}
      {sub != null && sub !== "" && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// Einheitlicher Kanal-Marker (Telefon = Burgund, E-Mail = Blau) für alle Seiten.
export function ChannelPill({ channel }) {
  const phone = channel === "phone";
  return (
    <span className={`db-pill ${phone ? "db-pill-burgundy" : "db-pill-info"}`}>
      <Icon d={phone ? I.phone : I.mail} size={10} />
      {phone ? "Telefon" : "E-Mail"}
    </span>
  );
}

// Status-Dot im Ampel-Vokabular: success/warn/error/info/neutral.
export function StatusDot({ tone = "neutral", title }) {
  return <span className={`status-dot ${tone}`} title={title} />;
}

// Freundlicher Leerzustand statt nackter Zeile.
export function EmptyState({ icon = "inbox", title, hint, action }) {
  return (
    <div className="db-empty-state">
      <span className="es-ico"><Icon d={I[icon]} size={22} /></span>
      <div className="es-title">{title}</div>
      {hint && <div className="es-hint">{hint}</div>}
      {action && <div className="es-action">{action}</div>}
    </div>
  );
}

export function Btn({ kind = "secondary", size, icon, iconR, children, ...rest }) {
  const cls = ["db-btn", `db-btn-${kind}`, size === "sm" && "db-btn-sm"]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {icon && <Icon d={I[icon]} size={size === "sm" ? 12 : 14} />}
      {children}
      {iconR && <Icon d={I[iconR]} size={size === "sm" ? 12 : 14} />}
    </button>
  );
}

export function Card({ title, kicker, action, children, soft, flat, style, bodyStyle, noBody }) {
  const cls = soft ? "db-card-soft" : flat ? "db-card-flat" : "db-card";
  return (
    <div className={cls} style={style}>
      {title && (
        <div className="db-card-header">
          <div className="db-card-title">{title}</div>
          {kicker && (
            <span className="mono" style={{ fontSize: 11, color: "var(--db-text-faint)" }}>
              {kicker}
            </span>
          )}
          <div style={{ marginLeft: "auto" }}>{action}</div>
        </div>
      )}
      {!noBody && (
        <div className="db-card-body" style={bodyStyle}>
          {children}
        </div>
      )}
      {noBody && children}
    </div>
  );
}
