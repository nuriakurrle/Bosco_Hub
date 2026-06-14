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
export function StatCard({ tone = "info", icon, label, value, sub, onClick, active = false }) {
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
      {sub != null && sub !== "" && <div className="stat-sub">{sub}</div>}
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
