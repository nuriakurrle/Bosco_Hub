"use client";
// components/ContractsView.js — Verträge-Section: Buchungen nach Vertrags-Status
// (Entwurf nötig / Versendet / Bestätigt) mit Frist-Ampel und Status-Aktionen.
import { useState } from "react";
import { Icon, I } from "@/components/icons";
import { Pill, StatCard } from "@/components/ui";
import ContractButton from "@/components/ContractDraft";
import BookingEditModal from "@/components/BookingEditModal";
import { useBookingEdit } from "@/lib/useBookingEdit";
import { fmtDE } from "@/lib/datefmt";
import { deadlineFor } from "@/lib/deadline";

const STATUS_META = {
  draft: { label: "Entwurf nötig", tone: "warn", icon: "doc" },
  sent: { label: "Versendet", tone: "info", icon: "send" },
  signed: { label: "Bestätigt", tone: "success", icon: "check" },
};

// Anzeige-Felder aus den (ggf. bearbeiteten) Rohwerten ableiten.
function deriveDisplay(it, houses) {
  let dates;
  if (it.startDate && it.endDate) dates = `${fmtDE(it.startDate)} – ${fmtDE(it.endDate)}`;
  else if (it.startDate) dates = fmtDE(it.startDate);
  else dates = it.dateRangeText || "—";
  return {
    ...it,
    title: it.groupLabel || it.school || "Buchung",
    house: houses.find((h) => h.id === it.houseId)?.name || "Ohne Haus",
    dates,
    people: it.peopleNum !== "" && it.peopleNum != null ? String(it.peopleNum) : "—",
    startTs: it.startDate ? new Date(it.startDate).getTime() : null,
    deadline: deadlineFor(it.startDate, it.contractStatus),
    origDeadline: deadlineFor(it.startDate, "draft"),
  };
}

export default function ContractsView({ data }) {
  const houses = data.houses || [];
  // flache, editierbare Liste; Gruppen werden daraus abgeleitet
  const { items, setItems, editing, setEditing, setField, saveDetails, saveText } = useBookingEdit(
    data.groups.flatMap((g) => g.items.map((it) => ({ ...it, origDeadline: deadlineFor(it.startDate, "draft") }))),
    (it) => deriveDisplay(it, houses)
  );
  // Sortierung: nach Aufenthaltsdatum (auf-/absteigend) oder Dringlichkeit (Default)
  const [sort, setSort] = useState("urgency");
  // Aktiver KPI-Filter (klickbare Karte): null | draft | sent | signed | overdue.
  const [focus, setFocus] = useState(null);

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

  // KPI-Karten doppeln als Filter (key = focus-Wert).
  const KPIS = [
    { key: "draft", tone: "warn", icon: "doc", label: "Entwurf nötig", val: kpi.draft },
    { key: "overdue", tone: "error", icon: "alert", label: "Überfällig", val: kpi.overdue },
    { key: "sent", tone: "info", icon: "send", label: "Versendet", val: kpi.sent },
    { key: "signed", tone: "success", icon: "check", label: "Bestätigt", val: kpi.signed },
  ];

  // Termin offen (kein Datum) immer ans Ende; sonst nach gewählter Sortierung.
  function sortList(list) {
    const arr = [...list];
    if (sort === "urgency") return arr; // Reihenfolge aus der Datenschicht (dringendste oben)
    return arr.sort((a, b) => {
      if (a.startTs == null && b.startTs == null) return 0;
      if (a.startTs == null) return 1;
      if (b.startTs == null) return -1;
      return sort === "date-asc" ? a.startTs - b.startTs : b.startTs - a.startTs;
    });
  }

  const groups = ["draft", "sent", "signed"]
    .map((key) => {
      let list = items.filter((x) => x.contractStatus === key);
      if (focus === "overdue") list = list.filter((x) => x.deadline.tone === "error");
      return { key, meta: STATUS_META[key], list: sortList(list) };
    })
    // Bei aktivem Status-Filter nur die gewählte Gruppe zeigen.
    .filter((g) => !focus || focus === "overdue" || g.key === focus);

  return (
    <div className="dash-wrap db-scroll">
      <div className="dash-inner">
        <div className="db-kicker" style={{ color: "var(--db-primary)" }}>Schritt 3 — Verträge &amp; Fristen</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2 }}>Verträge</h1>
          <div className="filter-chips" style={{ alignItems: "center" }}>
            <span className="db-faint" style={{ fontSize: 12, marginRight: 2 }}>Sortieren:</span>
            {[
              { key: "urgency", label: "Dringlichkeit" },
              { key: "date-asc", label: "Datum ↑" },
              { key: "date-desc", label: "Datum ↓" },
            ].map((o) => (
              <button
                key={o.key}
                className={`filter-chip ${sort === o.key ? "active" : ""}`}
                onClick={() => setSort(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <p className="db-muted" style={{ fontSize: 13, margin: "4px 0 14px", maxWidth: "64ch" }}>
          Jede Buchung braucht einen Vertrag — idealerweise rund <b>2 Wochen vor Anreise</b>. Die Ampel
          zeigt, was fällig oder überfällig ist, damit nichts vergessen wird.
        </p>

        {/* KPI — zugleich Filter */}
        <div className="dash-stats">
          {KPIS.map((k) => (
            <StatCard
              key={k.key}
              tone={k.tone}
              icon={k.icon}
              label={k.label}
              value={k.val}
              active={focus === k.key}
              onClick={() => setFocus(focus === k.key ? null : k.key)}
            />
          ))}
        </div>

        {focus && (
          <div className="db-faint" style={{ fontSize: 12, margin: "0 0 6px" }}>
            Gefiltert: {KPIS.find((k) => k.key === focus)?.label}.{" "}
            <button className="db-link" onClick={() => setFocus(null)}>alle zeigen</button>
          </div>
        )}

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
                      <Icon d={I.users} size={11} style={{ verticalAlign: -1 }} /> {b.people}{b.people !== "—" ? " Pers." : ""}
                    </div>
                  </div>
                  <div className="contract-actions">
                    <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => setEditing({ ...b })} title="Buchung bearbeiten">
                      <Icon d={I.pencil} size={12} /> bearbeiten
                    </button>
                    <ContractButton booking={b} onSaveText={(text) => saveText(b.id, text)} />
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

      <BookingEditModal
        editing={editing}
        houses={houses}
        onField={setField}
        onCancel={() => setEditing(null)}
        onSave={saveDetails}
      />
    </div>
  );
}
