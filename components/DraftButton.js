"use client";
// components/DraftButton.js — generischer Button + Modal mit editierbarem,
// lokal erzeugtem Textentwurf (Vertrag, Küchenplan, …). Kopieren/Drucken.
import { useState } from "react";
import { Icon, I } from "@/components/icons";

export default function DraftButton({ booking, label, icon = "doc", kind = "secondary", title, build, initialText, onSave }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function openModal(e) {
    e.preventDefault();
    e.stopPropagation();
    // Gespeicherten Text bevorzugen, sonst frisch aus den Buchungsdaten generieren.
    setText(initialText || build(booking));
    setSaved(false);
    setOpen(true);
  }
  async function save() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  function print() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<pre style="font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;padding:32px">${text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>`
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <>
      <button className={`db-btn db-btn-${kind} db-btn-sm`} onClick={openModal} title={title || label}>
        <Icon d={I[icon]} size={12} /> {label}
      </button>

      {open && (
        <div className="modal-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <Icon d={I[icon]} size={15} />
              <b>{title || label} · {booking.title || booking.school}</b>
              <button className="modal-x" onClick={() => setOpen(false)}><Icon d={I.x} size={14} /></button>
            </div>
            <textarea className="contract-text" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="modal-foot">
              <span className="db-faint" style={{ fontSize: 11.5, marginRight: "auto" }}>
                Platzhalter ____ ergänzen · Export folgt über n8n
              </span>
              <button className="db-btn db-btn-ghost db-btn-sm" onClick={copy}>{copied ? "kopiert ✓" : "kopieren"}</button>
              {onSave && (
                <button className="db-btn db-btn-sage db-btn-sm" onClick={save} disabled={saving}>
                  <Icon d={I.check} size={12} /> {saved ? "gespeichert ✓" : saving ? "speichert…" : "speichern"}
                </button>
              )}
              <button className="db-btn db-btn-primary db-btn-sm" onClick={print}><Icon d={I.doc} size={12} /> Drucken / PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
