"use client";
// components/TeamMenu.js — Team-Chip mit Aufklapp-Menü.
// Interview: "keiner weiß genau, wer was macht" → zeigt, wer im Team welchen
// Bereich verantwortet.
import { useState } from "react";
import { Icon, I } from "@/components/icons";

export default function TeamMenu({ staff = [] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button className="db-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon d={I.users} size={13} /> Team ({staff.length})
        <Icon d={I.chevDown} size={11} />
      </button>
      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <div className="team-menu">
            <div className="team-menu-head">Zuständigkeiten</div>
            {staff.map((s) => (
              <div key={s.key} className="team-menu-row">
                <span className="avatar sm">{s.short}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div>
                  <div className="db-muted" style={{ fontSize: 11 }}>{s.area || "—"}</div>
                </div>
              </div>
            ))}
            {staff.length === 0 && <div className="db-muted" style={{ padding: 8, fontSize: 12 }}>Kein Team.</div>}
          </div>
        </>
      )}
    </div>
  );
}
