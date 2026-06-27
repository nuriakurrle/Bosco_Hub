"use client";
// components/ConfirmationPanel.js — Customer confirmation (human-in-the-loop).
// Shows an editable draft (To/Betreff/Nachricht) and sends it via the API,
// which in turn triggers the n8n webhook → Outlook.
import { useState } from "react";
import { Btn } from "@/components/ui";
import { Icon, I } from "@/components/icons";
import { buildConfirmationDraft } from "@/lib/confirmation";

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
  padding: "8px",
  color: "var(--db-text)",
  background: "#fff",
};

export default function ConfirmationPanel({ item, makeDraft, onAiDraft }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(Boolean(item.confirmationSentAt));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Pide a la IA un borrador y reemplaza Betreff/Nachricht (editable después).
  async function aiDraft() {
    if (!onAiDraft) return;
    setAiLoading(true);
    try {
      const d = await onAiDraft();
      if (d) {
        if (d.subject) setSubject(d.subject);
        if (d.body) setBody(d.body);
      }
    } finally {
      setAiLoading(false);
    }
  }

  // Entwurf beim Öffnen frisch erzeugen (übernimmt zwischenzeitliche Änderungen).
  function openComposer() {
    const draft = makeDraft ? makeDraft() : buildConfirmationDraft(item);
    setTo(draft.to);
    setSubject(draft.subject);
    setBody(draft.body);
    setOpen(true);
  }

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/inquiries/${item.id}/confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text: body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Senden fehlgeschlagen.");
      }
      setSent(true);
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="sent-banner" style={{ marginTop: 14 }}>
        <Icon d={I.check} size={16} />
        <span>
          <b>Bestätigung an den Kunden gesendet.</b>
        </span>
      </div>
    );
  }

  return (
    <div className="followup" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon d={I.mail} size={14} style={{ color: "var(--db-secondary)" }} />
        <b style={{ fontSize: 13 }}>Kundenbestätigung</b>
        {!open && (
          <span style={{ marginLeft: "auto" }}>
            <Btn kind="sage" size="sm" icon="mail" onClick={openComposer}>
              Bestätigung vorbereiten
            </Btn>
          </span>
        )}
      </div>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <label style={labelStyle}>
            An
            <input style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label style={labelStyle}>
            Betreff
            <input
              style={inputStyle}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label style={labelStyle}>
            Nachricht
            <textarea
              style={{ ...inputStyle, minHeight: 230, fontSize: 14, fontFamily: "var(--db-font-serif)", lineHeight: 1.6 }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {error && (
            <span style={{ color: "var(--db-error)", fontSize: 12 }}>{error}</span>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="primary" size="sm" icon="send" disabled={sending || !to} onClick={send}>
              {sending ? "Senden…" : "Bestätigung senden"}
            </Btn>
            {onAiDraft && (
              <Btn kind="sage" size="sm" icon="spark" disabled={aiLoading} onClick={aiDraft}>
                {aiLoading ? "KI schreibt…" : "✨ mit KI verfassen"}
              </Btn>
            )}
            <Btn kind="ghost" size="sm" onClick={() => setOpen(false)}>
              Abbrechen
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
