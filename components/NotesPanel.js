"use client";
// components/NotesPanel.js — Team-Notizen am Vorgang (Übergabe) + Wissen pro
// Schule. Notizen anderer Vorgänge derselben Schule werden mit Hinweis gezeigt.
import { useState } from "react";
import { Icon, I } from "@/components/icons";

export default function NotesPanel({ inquiryId, schoolName, me, initialNotes = [] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    // Optimistisch einfügen.
    const optimistic = {
      id: `tmp-${Date.now()}`,
      body: text,
      pinned,
      authorName: "Ich",
      authorShort: (me || "?").slice(0, 2).toUpperCase(),
      time: "gerade eben",
      fromOtherCase: false,
    };
    setNotes((n) => [optimistic, ...n]);
    setBody("");
    const wasPinned = pinned;
    setPinned(false);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId, schoolName, author: me, body: text, pinned: wasPinned }),
      });
      const { note } = await res.json();
      if (note) setNotes((n) => n.map((x) => (x.id === optimistic.id ? note : x)));
    } catch {
      // bei Fehler optimistische Notiz wieder entfernen
      setNotes((n) => n.filter((x) => x.id !== optimistic.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notes-panel">
      <div className="notes-head">
        <Icon d={I.doc} size={14} />
        <b style={{ fontSize: 12.5 }}>Team-Notizen</b>
        <span className="db-faint" style={{ fontSize: 11 }}>· Übergabe &amp; Wissen zur Schule</span>
      </div>

      <div className="notes-compose">
        <textarea
          className="notes-input"
          rows={2}
          value={body}
          placeholder={'Notiz für das Team … (z. B. „angerufen, wartet auf Zahlen" oder „reine Mädchenklasse")'}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
        />
        <div className="notes-compose-foot">
          <label className="notes-pin">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            an Schule anheften
          </label>
          <button className="db-btn db-btn-primary db-btn-sm" disabled={!body.trim() || busy} onClick={add}>
            <Icon d={I.check} size={12} /> Notiz speichern
          </button>
        </div>
      </div>

      <div className="notes-list">
        {notes.length === 0 && (
          <div className="db-muted" style={{ fontSize: 12, padding: "6px 2px" }}>
            Noch keine Notizen. Die erste Übergabe-Info hilft dem nächsten Kollegen.
          </div>
        )}
        {notes.map((n) => (
          <div key={n.id} className={`note-item ${n.pinned ? "pinned" : ""}`}>
            <span className="avatar sm">{n.authorShort}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="note-meta">
                <b>{n.authorName}</b>
                <span className="db-faint"> · {n.time}</span>
                {n.pinned && <span className="note-tag">Schule</span>}
                {n.fromOtherCase && <span className="note-tag other">früherer Vorgang</span>}
              </div>
              <div className="note-body">{n.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
