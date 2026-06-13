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

// Vorschlag für ein Platzhalter-Feld je fehlender Angabe (Mitarbeiter:in kann
// es so direkt an die Schule schicken; die Schule füllt nur die Lücken aus).
const FIELD_PLACEHOLDER = {
  number_of_people: "Anzahl ____  (davon männlich ____ / weiblich ____)",
  date_range: "Wunschzeitraum: ____. – ____.____",
  grade_level: "Jahrgangsstufe / Alter: ____",
  special_requirements: "Allergien / Besonderheiten / Verpflegung: ____",
  contact_person: "Ansprechperson + Telefon: ____",
  program_type: "Gewünschtes Programm: ____",
  house: "Gewünschtes Haus: ____",
  school_name: "Name der Schule/Gruppe: ____",
};

// Baut einen vorausgefüllten Rückfrage-Entwurf: jede fehlende Angabe wird als
// ausfüllbarer Platzhalter eingefügt; bekannter Kontext oben als Bezug.
function buildDraft(missing, contactFirstName, requestRef) {
  const bullets = missing
    .map((m) => `•  ${FIELD_PLACEHOLDER[m.key] || `${m.label}: ____`}`)
    .join("\n");
  return (
    `Guten Tag${contactFirstName ? ` ${contactFirstName}` : ""},\n\n` +
    `vielen Dank für Ihre Anfrage${requestRef ? ` (${requestRef})` : ""}. ` +
    `Für die verbindliche Bearbeitung benötigen wir noch folgende Angaben — ` +
    `bitte ergänzen Sie diese direkt:\n\n` +
    `${bullets}\n\n` +
    `Herzlichen Dank für die kurze Rückmeldung.\n\n` +
    `Freundliche Grüße\nZUK Benediktbeuern`
  );
}

// Pflicht-Übersicht fehlender Infos + Rückfrage-Composer.
// `confirmed`/`onConfirm` vom Eltern gehalten; `onSend(text)` schickt den Entwurf.
export function MissingSummary({ missing = [], contactFirstName, requestRef, onSend, confirmed, onConfirm }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  if (missing.length === 0) return null;

  function openComposer() {
    setDraft(buildDraft(missing, contactFirstName, requestRef));
    setOpen(true);
  }
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

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

      {!open ? (
        <div className="ms-actions">
          <Btn kind="sage" size="sm" icon="send" onClick={openComposer}>
            Rückfrage an {contactFirstName || "Kontakt"} entwerfen
          </Btn>
          <label className="ms-confirm">
            <input type="checkbox" checked={confirmed} onChange={(e) => onConfirm?.(e.target.checked)} />
            Trotzdem fortfahren (als „Anfrage", Infos später ergänzen)
          </label>
        </div>
      ) : (
        <div className="composer">
          <div className="composer-label">Rückfrage-Entwurf · anpassbar</div>
          <textarea className="composer-text" value={draft} onChange={(e) => setDraft(e.target.value)} rows={9} />
          <div className="ms-actions">
            <Btn kind="primary" size="sm" icon="send" onClick={() => { onSend?.(draft); setOpen(false); }}>
              Senden (n8n)
            </Btn>
            <Btn kind="ghost" size="sm" onClick={copyDraft}>
              {copied ? "kopiert ✓" : "kopieren"}
            </Btn>
            <Btn kind="ghost" size="sm" onClick={() => setOpen(false)}>
              abbrechen
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
