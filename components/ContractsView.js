"use client";
// components/ContractsView.js — Verträge-Section: Buchungen nach Vertrags-Status
// (Entwurf nötig / Versendet / Bestätigt) mit Frist-Ampel und Status-Aktionen.
import { useState } from "react";
import { Icon, I } from "@/components/icons";
import { Pill } from "@/components/ui";
import ContractButton from "@/components/ContractDraft";

const STATUS_META = {
  draft: { label: "Entwurf nötig", tone: "warn", icon: "doc" },
  sent: { label: "Versendet", tone: "info", icon: "send" },
  signed: { label: "Bestätigt", tone: "success", icon: "check" },
};

export default function ContractsView({ data }) {
  // flache, editierbare Liste; Gruppen werden daraus abgeleitet
  const [items, setItems] = useState(() =>
    data.groups.flatMap((g) => g.items.map((it) => ({ ...it, origDeadline: it.deadline })))
  );

  async function setStatus(id, status) {
    setItems((list) =>
      list.map((it) =>
        it.id === id
          ? {
              ...it,
              contractStatus: status,
              deadline:
                status === "sent"
                  ? { tone: "info", label: "versendet" }
                  : status === "signed"
                  ? { tone: "success", label: "bestätigt" }
                  : it.origDeadline,
            }
          : it
      )
    );
    try {
      await fetch(`/api/bookings/${id}/contract`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      /* optimistisch belassen */
    }
  }

  const kpi = {
    draft: items.filter((x) => x.contractStatus === "draft").length,
    sent: items.filter((x) => x.contractStatus === "sent").length,
    signed: items.filter((x) => x.contractStatus === "signed").length,
    overdue: items.filter((x) => x.deadline.tone === "error").length,
  };

  const KPIS = [
    { tone: "warn", label: "Entwurf nötig", val: kpi.draft },
    { tone: "error", label: "Überfällig", val: kpi.overdue },
    { tone: "info", label: "Versendet", val: kpi.sent },
    { tone: "success", label: "Bestätigt", val: kpi.signed },
  ];
  const TONE_INK = { warn: "var(--db-warn)", error: "var(--db-error)", info: "var(--db-info)", success: "var(--db-success)" };

  const groups = ["draft", "sent", "signed"].map((key) => ({
    key,
    meta: STATUS_META[key],
    list: items.filter((x) => x.contractStatus === key),
  }));

  return (
    <div className="dash-wrap db-scroll">
      <div className="dash-inner">
        <div className="db-kicker" style={{ color: "var(--db-primary)" }}>Schritt 3 — Verträge &amp; Fristen</div>
        <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2 }}>Verträge</h1>
        <p className="db-muted" style={{ fontSize: 13, margin: "4px 0 14px", maxWidth: "64ch" }}>
          Jede Buchung braucht einen Vertrag — idealerweise rund <b>2 Wochen vor Anreise</b>. Die Ampel
          zeigt, was fällig oder überfällig ist, damit nichts vergessen wird.
        </p>

        {/* KPI */}
        <div className="dash-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {KPIS.map((k, idx) => (
            <div key={idx} className="stat-card" style={{ background: "var(--db-paper)", borderLeft: `3px solid ${TONE_INK[k.tone]}` }}>
              <div className="stat-value" style={{ color: TONE_INK[k.tone], fontSize: 26 }}>{k.val}</div>
              <div className="stat-sub">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Status-Gruppen */}
        {groups.map((g) => (
          <div key={g.key} className="contracts-group">
            <div className="contracts-group-head">
              <Pill tone={g.meta.tone} dot={false}><Icon d={I[g.meta.icon]} size={11} /> {g.meta.label}</Pill>
              <span className="db-faint" style={{ fontSize: 12 }}>· {g.list.length}</span>
            </div>
            {g.list.length === 0 && <div className="db-muted" style={{ fontSize: 12, padding: "2px 4px 8px" }}>—</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.list.map((b) => (
                <div key={b.id} className="contract-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{b.title}</span>
                      <Pill tone={b.deadline.tone === "neutral" ? "neutral" : b.deadline.tone} dot={b.deadline.tone === "error"}>
                        {b.deadline.tone === "error" && <Icon d={I.alert} size={10} />} {b.deadline.label}
                      </Pill>
                    </div>
                    <div className="db-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {b.house} · {b.program || "Aufenthalt"}{b.contact ? ` · ${b.contact}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{b.dates}</div>
                    <div className="db-faint" style={{ fontSize: 11.5 }}>
                      <Icon d={I.users} size={11} style={{ verticalAlign: -1 }} /> {b.people}
                    </div>
                  </div>
                  <div className="contract-actions">
                    <ContractButton booking={b} />
                    {b.contractStatus === "draft" && (
                      <button className="db-btn db-btn-sage db-btn-sm" onClick={() => setStatus(b.id, "sent")}>
                        <Icon d={I.send} size={12} /> versendet
                      </button>
                    )}
                    {b.contractStatus === "sent" && (
                      <button className="db-btn db-btn-primary db-btn-sm" onClick={() => setStatus(b.id, "signed")}>
                        <Icon d={I.check} size={12} /> bestätigt
                      </button>
                    )}
                    {b.contractStatus === "signed" && (
                      <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => setStatus(b.id, "draft")} title="zurücksetzen">
                        <Icon d={I.refresh} size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="db-muted" style={{ textAlign: "center", padding: 40 }}>Noch keine Buchungen — also keine Verträge.</div>
        )}
      </div>
    </div>
  );
}
