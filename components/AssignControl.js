"use client";
// AssignControl — Pille + Personen-Menü, um eine Anfrage einem Team-Mitglied
// zuzuweisen. Präsentationell: Team (`staff`), aktueller Nutzer (`me`) und
// optional die Auslastung je Person (`loadByKey`) kommen per Props; der Parent
// persistiert via onAssign(id, key|null).
//
// Das Menü wird `fixed` am Auslöser positioniert, weil die Anfrage-Karte
// `overflow:hidden` hat (würde ein absolutes Dropdown abschneiden).
import { useState, useRef } from "react";
import { Icon, I } from "@/components/icons";

export default function AssignControl({ id, who, suggest, onAssign, staff = [], me, loadByKey }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  const byKey = (k) => staff.find((s) => s.key === k);
  const assignee = who && byKey(who);
  const suggested = byKey(suggest);

  function toggle(e) {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpen(true);
  }

  function pick(e, key) {
    e.stopPropagation();
    setOpen(false);
    onAssign(id, key);
  }

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        ref={btnRef}
        className={`assignee ${assignee ? "" : "unassigned"}`}
        title={assignee ? `${assignee.name} · ${assignee.area}` : suggested ? `Vorschlag: ${suggested.name}` : "Zuweisen"}
        onClick={toggle}
      >
        {assignee ? (
          <>
            <span className="assignee-av" style={{ background: "#d9b89a" }}>{assignee.short}</span>
            {assignee.name.split(" ")[0]}{who === me ? " · Sie" : ""}
          </>
        ) : (
          <>
            <Icon d={I.users} size={12} />
            {suggested ? `${suggested.name.split(" ")[0]}?` : "Zuweisen"}
          </>
        )}
        <Icon d={I.chevron} size={11} className="assignee-caret" />
      </button>

      {open && pos && (
        <>
          <div className="booking-menu-overlay" style={{ zIndex: 60 }} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="assign-menu" style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 61 }}>
            <div className="assign-menu-head">Zuweisen an</div>
            {staff.map((s) => {
              const load = loadByKey ? loadByKey[s.key] || 0 : null;
              const isCur = s.key === who;
              return (
                <button
                  key={s.key}
                  className={`assign-opt ${isCur ? "current" : ""}`}
                  onClick={(e) => pick(e, s.key)}
                >
                  <span className="avatar sm">{s.short}</span>
                  <span className="assign-opt-text">
                    <span className="assign-opt-name">{s.name}{s.key === me ? " (ich)" : ""}</span>
                    <span className="assign-opt-sub">{s.area || "—"}</span>
                  </span>
                  {s.key === suggest && !isCur && <span className="assign-tag">Vorschlag</span>}
                  {load != null && <span className="mono assign-load" title="offene Anfragen">{load}</span>}
                  {isCur && <Icon d={I.check} size={13} style={{ color: "var(--db-secondary)" }} />}
                </button>
              );
            })}
            {assignee && (
              <button className="assign-opt clear" onClick={(e) => pick(e, null)}>
                <Icon d={I.x} size={12} /> Zuweisung aufheben
              </button>
            )}
          </div>
        </>
      )}
    </span>
  );
}
