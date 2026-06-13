"use client";
// components/EmailSource.js — wiederverwendbare Quell-Ansicht (E-Mail/Telefon)
// für Einzel- und Mehrfach-Vorgänge. Bündelt die Lesbarkeits-Verbesserungen:
//   • TL;DR-Zusammenfassung des Agenten
//   • Routing-Begründung ("Erkannt → Haus · Vorschlag Person")
//   • Sensible Daten ausgeblendet (DSGVO Art. 9) mit "Einblenden"
//   • Telefon-Transkript sauber beschriftet
//   • markierter Text mit Feld↔Text-Hover
import { useState } from "react";
import { Icon, I } from "@/components/icons";
import { Pill } from "@/components/ui";
import HighlightEmail from "@/components/HighlightEmail";
import { areaLabel, areaColor, suggestedPerson } from "@/lib/team";

export default function EmailSource({ item, fields, staff = [], activeKey, onMarkHover, legendCompact }) {
  const [revealed, setRevealed] = useState(false);
  const isPhone = item.channel === "phone";
  const sensitive = item.containsSensitiveData && !revealed;

  const area = item.responsibleArea && areaLabel(item.responsibleArea) !== "—" ? item.responsibleArea : item.house;
  const suggestKey = suggestedPerson(area, staff);
  const suggestName = staff.find((s) => s.key === suggestKey)?.name;

  return (
    <div className="email-src">
      {/* Absender / Anrufer */}
      <div className="src-from mono">
        {isPhone ? "Anrufer: " : "Von: "}
        {item.from}
        {item.customerEmail ? ` · ${item.customerEmail}` : ""}
        {` · ${item.receivedAbs}`}
      </div>

      {/* Routing-Begründung */}
      {areaLabel(area) !== "—" && (
        <div className="src-routing">
          <span className="route-area-dot" style={{ background: areaColor(area) }} />
          <span>
            Erkannt → <b>{areaLabel(area)}</b>
            {suggestName ? <> · Vorschlag: <b>{suggestName}</b></> : null}
          </span>
        </div>
      )}

      {item.subject && <p className="src-subject">{item.subject}</p>}

      {/* Markierungs-Legende */}
      {item.rawBody && (
        <div className="hl-legend">
          <span className="hl-key"><i className="hl hl-who" /> Schule/Kontakt</span>
          <span className="hl-key"><i className="hl hl-date" /> Zeitraum</span>
          <span className="hl-key"><i className="hl hl-people" /> Personen</span>
          <span className="hl-key"><i className="hl hl-prog" /> Programm/Haus</span>
          {!legendCompact && <span className="hl-key"><i className="hl hl-extra" /> Besonderes</span>}
        </div>
      )}

      {/* Body */}
      {item.rawBody ? (
        <div className={`src-body ${sensitive ? "redacted" : ""}`}>
          <HighlightEmail body={item.rawBody} fields={fields} activeKey={activeKey} onMarkHover={onMarkHover} />
          {sensitive && (
            <div className="redact-overlay">
              <Icon d={I.shield} size={20} />
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>Sensible Daten ausgeblendet</div>
              <div className="db-muted" style={{ fontSize: 11.5, maxWidth: "40ch", textAlign: "center" }}>
                {item.sensitiveDataNote || "Gesundheitsdaten · DSGVO Art. 9."} Nur für berechtigtes Personal.
              </div>
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => setRevealed(true)}>
                <Icon d={I.shield} size={12} /> Einblenden
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="db-email">
          <p className="db-muted" style={{ fontStyle: "italic" }}>
            {isPhone
              ? "Kein Transkript gespeichert. (Anruf-Transkription folgt über n8n.)"
              : "Kein E-Mail-Text gespeichert. Aktiviere das Speichern von raw_body im n8n-Workflow."}
          </p>
        </div>
      )}

      {item.containsSensitiveData && revealed && (
        <div style={{ marginTop: 6 }}>
          <Pill tone="error" dot={false}><Icon d={I.shield} size={11} /> Sensible Daten sichtbar · DSGVO Art. 9</Pill>
        </div>
      )}
    </div>
  );
}
