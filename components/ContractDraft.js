"use client";
// components/ContractDraft.js — Button + Modal mit editierbarem Vertragsentwurf.
// Wird in der Buchungsliste verwendet. Kein API-Aufruf: Text wird lokal erzeugt,
// kann angepasst, kopiert oder gedruckt werden.
import { useState } from "react";
import { Icon, I } from "@/components/icons";
import { buildContractDraft } from "@/lib/contract";

export default function ContractButton({ booking }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  function openModal(e) {
    e.preventDefault();
    e.stopPropagation();
    setText(buildContractDraft(booking));
    setOpen(true);
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
      <button className="db-btn db-btn-secondary db-btn-sm" onClick={openModal} title="Vertragsentwurf">
        <Icon d={I.doc} size={12} /> Vertrag
      </button>

      {open && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <Icon d={I.doc} size={15} />
              <b>Vertragsentwurf · {booking.title || booking.school}</b>
              <button className="modal-x" onClick={() => setOpen(false)}><Icon d={I.x} size={14} /></button>
            </div>
            <textarea className="contract-text" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="modal-foot">
              <span className="db-faint" style={{ fontSize: 11.5, marginRight: "auto" }}>
                Platzhalter ____ aus Hausmanager ergänzen · Word/PDF-Export folgt über n8n
              </span>
              <button className="db-btn db-btn-ghost db-btn-sm" onClick={copy}>{copied ? "kopiert ✓" : "kopieren"}</button>
              <button className="db-btn db-btn-primary db-btn-sm" onClick={print}><Icon d={I.doc} size={12} /> Drucken / PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
