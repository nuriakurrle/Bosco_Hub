"use client";
// components/FollowUpPanel.js — Rückfrage-/Nachfass-E-Mail (human-in-the-loop):
// listet die noch fehlenden Pflicht-Angaben einer Anfrage in einem editierbaren
// Entwurf (An/Betreff/Nachricht). Pendant zur Kundenbestätigung. Versand läuft
// (wie die Bestätigung) über n8n; hier wird der Entwurf geprüft und ausgelöst.
import { useState } from "react";
import { Btn } from "@/components/ui";
import { Icon, I } from "@/components/icons";
import { buildInquiryFollowUp } from "@/lib/followup";

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: "var(--db-text-muted)",
};
const inputStyle = {
  fontFamily: "inherit",
  fontSize: 14,
  border: "1px solid var(--db-line-strong)",
  borderRadius: 6,
  padding: "8px 10px",
  color: "var(--db-text)",
  background: "#fff",
};

export default function FollowUpPanel({ item, missing = [], onSend, makeDraft }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  // Ohne fehlende Pflicht-Angaben gibt es nichts nachzufragen.
  if (missing.length === 0) return null;

  // Beim Öffnen aus den aktuell fehlenden Feldern frisch erzeugen.
  function openComposer() {
    const draft = makeDraft ? makeDraft() : buildInquiryFollowUp(item, missing);
    setTo(draft.to);
    setSubject(draft.subject);
    setBody(draft.body);
    setOpen(true);
  }
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(`Betreff: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  async function send() {
    // El padre hace el envío real (POST a n8n) y devuelve false si falla.
    const ok = await onSend?.({ to, subject, body });
    if (ok === false) return; // mantener el editor abierto para reintentar
    setSent(true);
    setOpen(false);
  }

  if (sent) {
    return (
      <div className="sent-banner" style={{ marginTop: 14 }}>
        <Icon d={I.send} size={16} />
        <span><b>Rückfrage an den Kunden gesendet.</b></span>
      </div>
    );
  }

  return (
    <div className="followup" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon d={I.send} size={14} style={{ color: "var(--db-secondary)" }} />
        <b style={{ fontSize: 12.5 }}>Rückfrage — fehlende Infos</b>
        <span className="db-faint" style={{ fontSize: 11 }}>
          · {missing.length} Angabe{missing.length > 1 ? "n" : ""}
        </span>
        {!open && (
          <span style={{ marginLeft: "auto" }}>
            <Btn kind="sage" size="sm" icon="send" onClick={openComposer}>
              Rückfrage vorbereiten
            </Btn>
          </span>
        )}
      </div>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <label style={labelStyle}>
            An
            <input style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} placeholder="E-Mail des Kunden" />
          </label>
          <label style={labelStyle}>
            Betreff
            <input style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label style={labelStyle}>
            Nachricht
            <textarea
              style={{ ...inputStyle, minHeight: 250, fontSize: 14.5, fontFamily: "var(--db-font-serif)", lineHeight: 1.6 }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="primary" size="sm" icon="send" disabled={!to} onClick={send}>
              Rückfrage senden
            </Btn>
            <Btn kind="ghost" size="sm" onClick={copyDraft}>
              {copied ? "kopiert ✓" : "kopieren"}
            </Btn>
            <Btn kind="ghost" size="sm" onClick={() => setOpen(false)}>
              Abbrechen
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
