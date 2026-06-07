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
