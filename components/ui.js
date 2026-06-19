// components/ui.js — Reusable UI components (ported from shared.jsx).
import { Icon, I } from "@/components/icons";

export function Pill({ tone = "neutral", children, dot = true }) {
  return (
    <span className={`db-pill db-pill-${tone}`}>
      {dot && <span className="db-pill-dot" />}
      {children}
    </span>
  );
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
export function StatCard({ tone = "info", icon, label, value, sub, delta, deltaLabel = "ggü. Vorwoche", onClick, active = false }) {
  return (
    <div
      className={`stat-card${active ? " active" : ""}`}
      style={{ "--stat-ink": STAT_INK[tone] || STAT_INK.info, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <div className="stat-head">
        {icon && <span className="stat-ico"><Icon d={I[icon]} size={14} /></span>}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
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
      <Icon d={phone ? I.clock : I.mail} size={10} />
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
