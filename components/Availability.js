"use client";
// components/Availability.js — Belegungs-/Saison-Check + Zimmer-/Datenschutz-Gate.
// Rein darstellend: bekommt das `assessment`-Objekt aus lib/availability.js und
// ruft Callbacks (onSelectAlternative, onAsk, onEstimate) für Aktionen auf.
// Die Kapazität ist eine Schätzung, bis die Hausmanager-API angebunden ist —
// das wird im UI bewusst kenntlich gemacht.
import { useState } from "react";
import { Icon, I } from "@/components/icons";
import { Pill, Btn } from "@/components/ui";

const VERDICT = {
  frei: { tone: "success", label: "Platz frei", split: "ok" },
  eng: { tone: "warn", label: "Eng", split: "tight" },
  voll: { tone: "error", label: "Voll", split: "full" },
  konflikt: { tone: "error", label: "Saison-Konflikt", split: "full" },
  unklar: { tone: "neutral", label: "Prüfen", split: "" },
};

export function verdictMeta(verdict) {
  return VERDICT[verdict] || VERDICT.unklar;
}

export function VerdictPill({ verdict }) {
  const v = verdictMeta(verdict);
  return (
    <Pill tone={v.tone} dot={verdict !== "unklar"}>
      {verdict === "frei" && <Icon d={I.check} size={11} />}
      {(verdict === "voll" || verdict === "konflikt") && <Icon d={I.alert} size={11} />}
      {v.label}
    </Pill>
  );
}

// Schmaler Auslastungs-Balken (Betten + Referent:innen-Slots).
export function CapacityMeter({ capacity }) {
  if (!capacity) return null;
  const bedsPct = Math.round(capacity.bedsRatio * 100);
  const tone = bedsPct >= 100 ? "full" : bedsPct >= 85 ? "tight" : "ok";
  return (
    <div className="cap-meter">
      <div className="cap-row">
        <span className="cap-ico"><Icon d={I.bed} size={13} /></span>
        <div className="cap-track">
          <div className={`cap-fill ${tone}`} style={{ width: `${bedsPct}%` }} />
        </div>
        <span className="cap-num mono">
          {capacity.bedsUsed + capacity.need}/{capacity.beds}
        </span>
      </div>
      <div className="cap-row">
        <span className="cap-ico"><Icon d={I.users} size={13} /></span>
        <div className="cap-slots">
          {Array.from({ length: capacity.referentSlots }).map((_, i) => (
            <span key={i} className={`cap-slot ${i < capacity.parallelPrograms ? "used" : ""}`} />
          ))}
        </div>
        <span className="cap-num mono">
          {capacity.parallelPrograms}/{capacity.referentSlots} Referent:innen
        </span>
      </div>
    </div>
  );
}

// Volle Karte für die Einzelansicht (Detail).
export function AvailabilityCard({ assessment, onSelectAlternative }) {
  const a = assessment?.availability;
  if (!a) return null;
  const v = verdictMeta(a.verdict);
  return (
    <div className={`avail-card ${v.split || "neutral"}`}>
      <div className="avail-head">
        <Icon d={I.bed} size={15} />
        <span className="db-card-title">Belegung &amp; Konflikt</span>
        <span style={{ marginLeft: "auto" }}><VerdictPill verdict={a.verdict} /></span>
      </div>

      <div className="avail-body">
        <div className="avail-kv">
          <span className="k">Haus</span>
          <span>{a.house || "—"}</span>
        </div>
        <div className="avail-kv">
          <span className="k">Termin</span>
          <span className="mono">{a.dates ? `${a.dates.start} – ${a.dates.end}` : "frei formuliert — bitte ergänzen"}</span>
        </div>

        {!a.season.ok && (
          <div className="season-banner">
            <Icon d={I.alert} size={14} />
            <span>{a.season.message}</span>
          </div>
        )}

        {a.capacity && <CapacityMeter capacity={a.capacity} />}

        {a.reasons?.length > 0 && (
          <ul className="avail-reasons">
            {a.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}

        {a.alternatives?.length > 0 && (
          <div className="avail-alts">
            <div className="alts-title">
              <Icon d={I.spark} size={13} /> Vorgeschlagene Alternativen
            </div>
            {a.alternatives.map((alt, i) => (
              <div key={i} className="alt-row">
                <div>
                  <span className="mono" style={{ fontWeight: 600 }}>{alt.label}</span>
                  <span className="db-faint" style={{ fontSize: 11, marginLeft: 8 }}>{alt.note}</span>
                </div>
                <Btn kind="ghost" size="sm" onClick={() => onSelectAlternative?.(alt)}>
                  Vorschlagen
                </Btn>
              </div>
            ))}
          </div>
        )}

        <p className="cap-disclaimer">
          Kapazität geschätzt · Belegung aus angelegten Buchungen. Hausmanager-Abgleich folgt.
        </p>
      </div>
    </div>
  );
}

// Zimmer-Gate (Component 4, an den Interviews ausgerichtet).
export function SafetyGate({ assessment, contactName, onAsk, onEstimate }) {
  const s = assessment?.safety;
  const [genderOk, setGenderOk] = useState(false);
  if (!s) return null;

  const genderResolved = s.gender.known || genderOk;

  return (
    <div className="gate-card">
      <div className="avail-head">
        <Icon d={I.shield} size={15} />
        <span className="db-card-title">Zimmer &amp; Betreuung</span>
        <span style={{ marginLeft: "auto" }}>
          {genderResolved ? (
            <Pill tone="success"><Icon d={I.check} size={11} /> geklärt</Pill>
          ) : (
            <Pill tone="warn">offen</Pill>
          )}
        </span>
      </div>

      <div className="avail-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Geschlechter-Aufteilung → Zimmerzuteilung */}
        <div className={`gate-item ${s.gender.known ? "ok" : "warn"}`}>
          <span className="gate-ico"><Icon d={s.gender.known ? I.check : I.alert} size={14} /></span>
          <div style={{ flex: 1 }}>
            <div className="gate-title">Geschlechter-Aufteilung</div>
            <div className="gate-sub">
              {s.gender.known
                ? `Erkannt: ${s.gender.value}.`
                : "Fehlt — für die Zimmerzuteilung nötig (M/W nicht auf einem Gang/Stockwerk, geteilte Bäder)."}
            </div>
          </div>
          {!s.gender.known &&
            (genderOk ? (
              <Pill tone="warn" dot={false}>geschätzt</Pill>
            ) : (
              <span style={{ display: "flex", gap: 8 }}>
                <Btn kind="sage" size="sm" icon="send" onClick={() => onAsk?.("gender")}>
                  Bei {contactName || "Kontakt"} nachfragen
                </Btn>
                <Btn kind="ghost" size="sm" onClick={() => { onEstimate?.("gender"); setGenderOk(true); }}>
                  schätzen
                </Btn>
              </span>
            ))}
        </div>

        {/* Ressourcen / Referent:innen */}
        {s.resource.referentsAvailable != null && (
          <div className={`gate-item ${s.resource.ok ? "ok" : "warn"}`}>
            <span className="gate-ico"><Icon d={I.users} size={14} /></span>
            <div style={{ flex: 1 }}>
              <div className="gate-title">Betreuung &amp; Referent:innen</div>
              <div className="gate-sub">
                ca. {s.resource.referentsNeeded} Referent:in{s.resource.referentsNeeded > 1 ? "nen" : ""} nötig ·
                {" "}{s.resource.referentsAvailable} im Haus parallel möglich.
                {s.resource.qualified != null && (
                  <> · <b>{s.resource.qualified}</b> für „{s.resource.skill}" qualifiziert</>
                )}
              </div>
            </div>
            <Pill tone={s.resource.qualified === 0 ? "error" : s.resource.ok ? "success" : "warn"} dot={false}>
              {s.resource.qualified === 0 ? "kein:e Referent:in" : s.resource.ok ? "abgedeckt" : "knapp"}
            </Pill>
          </div>
        )}
      </div>
    </div>
  );
}
