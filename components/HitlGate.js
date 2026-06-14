"use client";
// components/HitlGate.js — Verständlichkeits- & HITL-Bausteine:
//   • Stepper        — zeigt, wo im Prozess man steht (Zuteilen→Prüfen→Belegung→Freigabe)
//   • VerifyGate      — Pflicht-Checkbox + "Verifiziert von X um Y" (Human-in-the-loop)
//   • DuplicateBanner — Warnung bei möglicher Doppelanfrage
//   • MissingSummary  — Pflicht-Übersicht fehlender Infos mit Bestätigung
// Alles rein darstellend, im Don-Bosco-Look (siehe globals.css).
import { useState } from "react";
import { Icon, I } from "@/components/icons";
import { Pill, Btn } from "@/components/ui";

export const FLOW_STEPS = ["Zuteilen", "Prüfen", "Belegung", "Freigabe"];

export function Stepper({ current = 0 }) {
  return (
    <div className="stepper" role="list">
      {FLOW_STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <div key={label} className={`step ${state}`} role="listitem">
            <span className="step-dot">
              {state === "done" ? <Icon d={I.check} size={11} stroke={2.4} /> : i + 1}
            </span>
            <span className="step-label">{label}</span>
            {i < FLOW_STEPS.length - 1 && <span className="step-bar" />}
          </div>
        );
      })}
    </div>
  );
}

// Zeit "HH:MM" für die Audit-Zeile.
function nowTime() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Pflicht-Verifizierung vor dem Anlegen. `checked`/`onToggle` werden vom Eltern-
// Component gehalten; `verifierName` = Klartextname der eingeloggten Person.
export function VerifyGate({ checked, onToggle, verifierName, verifiedAt, locked, label }) {
  return (
    <div className={`verify-gate ${checked ? "checked" : ""}`}>
      <label className="verify-row">
        <input
          type="checkbox"
          checked={checked}
          disabled={locked}
          onChange={(e) => onToggle?.(e.target.checked)}
        />
        <span className="verify-text">
          {label || "Ich habe alle Angaben geprüft und gebe diese Buchung frei."}
        </span>
      </label>
      {checked && (
        <div className="verify-audit">
          <Icon d={I.check} size={12} stroke={2.4} />
          Verifiziert von <b>{verifierName || "—"}</b> · {verifiedAt || nowTime()}
        </div>
      )}
    </div>
  );
}

export { nowTime };

export function DuplicateBanner({ dup, onReview }) {
  if (!dup) return null;
  const pct = Math.round(dup.score * 100);
  return (
    <div className="dup-banner">
      <Icon d={I.link} size={15} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5 }}>
          Mögliche Doppelanfrage ({pct}% Übereinstimmung)
        </div>
        <div className="db-muted" style={{ fontSize: 11.5, marginTop: 1 }}>
          Ähnelt Buchung <span className="mono">#{dup.booking.id}</span>
          {dup.booking.school ? ` · ${dup.booking.school}` : ""}
          {dup.reasons.length ? ` — ${dup.reasons.join(", ")}` : ""}.
        </div>
      </div>
      <Btn kind="ghost" size="sm" onClick={() => onReview?.(dup)}>
        Prüfen
      </Btn>
    </div>
  );
}

// Pflicht-Übersicht fehlender Infos + Freigabe-Schalter. Der editierbare Rückfrage-
// Entwurf an den Kunden liegt jetzt in FollowUpPanel (An/Betreff/Nachricht), direkt
// darunter — `confirmed`/`onConfirm` werden vom Eltern gehalten.
export function MissingSummary({ missing = [], confirmed, onConfirm }) {
  if (missing.length === 0) return null;

  return (
    <div className="missing-summary">
      <div className="ms-head">
        <Icon d={I.alert} size={14} />
        <b>{missing.length} Pflicht-Angabe{missing.length > 1 ? "n" : ""} fehlt</b>
        <span style={{ marginLeft: "auto" }}>
          <Pill tone={confirmed ? "success" : "warn"} dot={false}>
            {confirmed ? "bestätigt" : "offen"}
          </Pill>
        </span>
      </div>
      <ul className="ms-list">
        {missing.map((m) => (
          <li key={m.id || m.label}>{m.label}</li>
        ))}
      </ul>

      <div className="ms-actions">
        <span className="db-faint" style={{ fontSize: 11.5 }}>
          <Icon d={I.send} size={11} style={{ verticalAlign: -1 }} /> Rückfrage-E-Mail dazu unten als Entwurf.
        </span>
        <label className="ms-confirm">
          <input type="checkbox" checked={confirmed} onChange={(e) => onConfirm?.(e.target.checked)} />
          Trotzdem fortfahren (als „Anfrage", Infos später ergänzen)
        </label>
      </div>
    </div>
  );
}
