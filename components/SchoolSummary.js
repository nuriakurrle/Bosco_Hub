"use client";
// components/SchoolSummary.js — Botón "✨ KI-Zusammenfassung" en el bloque de
// Stammkunde: pide a la IA un resumen del cliente on-demand y lo muestra.
import { useState } from "react";
import { Btn } from "@/components/ui";
import { Icon, I } from "@/components/icons";

export default function SchoolSummary({ schoolName }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schools/summary?name=${encodeURIComponent(schoolName)}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Fehlgeschlagen.");
      setSummary(d.summary || "Noch keine Daten für eine Zusammenfassung.");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (summary) {
    return (
      <div style={{ marginTop: 8, display: "flex", gap: 8, fontSize: 13, lineHeight: 1.5, color: "var(--db-text)" }}>
        <Icon d={I.spark} size={14} style={{ color: "var(--db-secondary)", flex: "none", marginTop: 1 }} />
        <span>{summary}</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <Btn kind="ghost" size="sm" icon="spark" disabled={loading} onClick={load}>
        {loading ? "KI fasst zusammen…" : "✨ KI-Zusammenfassung"}
      </Btn>
      {error && (
        <span style={{ color: "var(--db-error)", fontSize: 12, marginLeft: 8 }}>{error}</span>
      )}
    </div>
  );
}
