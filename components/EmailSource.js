"use client";
// components/EmailSource.js — wiederverwendbare Quell-Ansicht (E-Mail/Telefon)
// für Einzel- und Mehrfach-Vorgänge. Bündelt die Lesbarkeits-Verbesserungen:
//   • TL;DR-Zusammenfassung des Agenten
//   • Routing-Begründung ("Erkannt → Haus · Vorschlag Person")
//   • Telefon-Transkript sauber beschriftet
//   • markierter Text mit Feld↔Text-Hover
import { Icon, I } from "@/components/icons";
import HighlightEmail from "@/components/HighlightEmail";
import TranscriptPlayer from "@/components/TranscriptPlayer";
import { areaLabel, areaColor, suggestedPerson } from "@/lib/team";

export default function EmailSource({ item, fields, staff = [], activeKey, onMarkHover, legendCompact }) {
  const isPhone = item.channel === "phone";
  const usePlayer = item.rawBody && isPhone;

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

      {/* Markierungs-Legende — gleiche Farben für E-Mail UND Telefon-Transkript */}
      {item.rawBody && (
        <div className="hl-legend">
          <span className="hl-key"><i className="hl hl-who" /> Schule/Kontakt</span>
          <span className="hl-key"><i className="hl hl-date" /> Zeitraum</span>
          <span className="hl-key"><i className="hl hl-people" /> Personen</span>
          <span className="hl-key"><i className="hl hl-prog" /> Programm/Haus</span>
          {!legendCompact && <span className="hl-key"><i className="hl hl-extra" /> Besonderes</span>}
        </div>
      )}

      {/* Telefon-Aufnahme (echtes Audio von Twilio), falls vorhanden */}
      {isPhone && item.recordingUrl && (
        <audio
          controls
          preload="none"
          src={`/api/live-call/recording/${item.id}`}
          style={{ width: "100%", margin: "0 0 10px" }}
        />
      )}
      {isPhone && !item.recordingUrl && item.rawBody && (
        <div className="db-faint" style={{ fontSize: 11, margin: "0 0 8px", fontFamily: "var(--db-font-mono)" }}>
          Keine Tonaufnahme für dieses Gespräch — nur Transkript.
        </div>
      )}

      {/* Body — Telefon: abspielbares Transkript; E-Mail: markierter Text */}
      {usePlayer ? (
        <TranscriptPlayer text={item.rawBody} fields={fields} />
      ) : item.rawBody ? (
        <div className="src-body">
          <HighlightEmail body={item.rawBody} fields={fields} activeKey={activeKey} onMarkHover={onMarkHover} />
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
    </div>
  );
}
