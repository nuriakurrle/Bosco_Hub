"use client";
// components/PhoneTabs.js — Pantalla "Telefon" con dos pestañas:
//   Live    → la consola de transcripción en vivo (LiveCall).
//   Verlauf → el registro/historial de TODAS las llamadas guardadas, ordenado,
//             donde se abre el detalle de cada una (/inquiry/[id]).
// El historial llega ya cargado desde el servidor (page.js) como `calls`.
import { useState } from "react";
import Link from "next/link";
import LiveCall from "@/components/LiveCall";
import { Pill } from "@/components/ui";
import { Icon, I } from "@/components/icons";

// Estado del tracker → etiqueta + color (mismo criterio que el resto del dashboard).
const STATUS_META = {
  ready_for_review: { label: "Neu", tone: "info" },
  needs_info: { label: "Info fehlt", tone: "warn" },
  booking_created: { label: "Gebucht", tone: "success" },
};

export default function PhoneTabs({ calls = [] }) {
  const [tab, setTab] = useState("live"); // live | verlauf

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      {/* barra de pestañas */}
      <div className="intake-tabs" style={{ padding: "10px 22px 0", borderBottom: "1px solid var(--db-line)" }}>
        <button className={`intake-tab ${tab === "live" ? "active" : ""}`} onClick={() => setTab("live")}>
          <Icon d={I.clock} size={13} /> Live
        </button>
        <button className={`intake-tab ${tab === "verlauf" ? "active" : ""}`} onClick={() => setTab("verlauf")}>
          <Icon d={I.mail} size={13} /> Verlauf
          <span className="ch-count">{calls.length}</span>
        </button>
      </div>

      {tab === "live" ? <LiveCall /> : <CallLog calls={calls} />}
    </div>
  );
}

// ── Historial: lista ordenada de llamadas, cada una abre su detalle ────────────
function CallLog({ calls }) {
  if (!calls.length) {
    return (
      <div className="db-empty" style={{ flex: 1, padding: "60px 24px" }}>
        <Icon d={I.clock} size={22} />
        <div>Noch keine Telefonate aufgezeichnet. Beantwortete Anrufe erscheinen hier automatisch.</div>
      </div>
    );
  }
  return (
    <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: "16px 22px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--db-text-muted)", fontSize: 11.5 }}>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Zeitpunkt</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Gruppe / Schule</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Kontakt</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Art / Programm</th>
            <th style={{ padding: "8px 10px", fontWeight: 600 }}>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => {
            const st = STATUS_META[c.trackerStatus] || { label: c.trackerStatus || "—", tone: "neutral" };
            const art = c.fields?.find((f) => f.id === "art")?.value || c.summary || "Telefonat";
            return (
              <tr key={c.id} style={{ borderTop: "1px solid var(--db-line)" }}>
                <td style={{ padding: "11px 10px", whiteSpace: "nowrap" }}>
                  <Link href={`/inquiry/${c.id}`} style={{ fontWeight: 600 }}>{c.receivedAbs || c.received || "—"}</Link>
                </td>
                <td style={{ padding: "11px 10px" }}>{c.school}</td>
                <td style={{ padding: "11px 10px" }}>{c.from}</td>
                <td style={{ padding: "11px 10px", color: "var(--db-text-muted)" }}>{art}</td>
                <td style={{ padding: "11px 10px" }}><Pill tone={st.tone}>{st.label}</Pill></td>
                <td style={{ padding: "11px 10px", textAlign: "right" }}>
                  <Link href={`/inquiry/${c.id}`} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--db-primary)" }}>
                    Öffnen →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
