"use client";
// components/BookingsView.js — Buchungen (Hausmanager). Aufgewertet: breites,
// konsistentes Layout mit KPI-Zeile, Haus-Filter und Vertrags-Status je Buchung.
import { useState } from "react";
import Link from "next/link";
import { Icon, I } from "@/components/icons";
import { Pill, StatCard } from "@/components/ui";
import ContractButton from "@/components/ContractDraft";
import { MealButton } from "@/components/MealPlan";
import DraftButton from "@/components/DraftButton";
import BookingEditModal from "@/components/BookingEditModal";
import { computeTimeline } from "@/lib/timeline";
import { buildFollowUp, customerOpenKeys } from "@/lib/followup";
import { useBookingEdit } from "@/lib/useBookingEdit";
import { fmtDE } from "@/lib/datefmt";
import { areaColor } from "@/lib/team";

const STATUS = {
  reserved: { tone: "burgundy", label: "Reserviert" },
  confirmed: { tone: "success", label: "Bestätigt" },
  cancelled: { tone: "error", label: "Storniert" },
};
const CONTRACT = {
  draft: { tone: "warn", label: "Vertrag: Entwurf" },
  sent: { tone: "info", label: "Vertrag: versendet" },
  signed: { tone: "success", label: "Vertrag: bestätigt" },
};

// Anzeige-Felder aus den (ggf. bearbeiteten) Rohwerten neu ableiten.
function deriveBooking(it, houses) {
  let dates;
  if (it.startDate && it.endDate) dates = `${fmtDE(it.startDate)} – ${fmtDE(it.endDate)}`;
  else if (it.startDate) dates = fmtDE(it.startDate);
  else dates = it.dateRangeText || "—";
  const days = it.startDate && it.endDate
    ? Math.max(1, Math.round((new Date(it.endDate) - new Date(it.startDate)) / 86400000) + 1)
    : null;
  return {
    ...it,
    title: it.groupLabel || it.school || "Buchung",
    house: houses.find((h) => h.id === it.houseId)?.name || "Ohne Haus",
    dates,
    people: it.peopleNum !== "" && it.peopleNum != null ? String(it.peopleNum) : "—",
    startISO: it.startDate ? new Date(it.startDate).toISOString() : null,
    days,
  };
}

export default function BookingsView({ bookings, tasksDone = {}, me, houses = [] }) {
  const { items, editing, setEditing, setField, saveDetails, saveText } = useBookingEdit(
    bookings,
    (it) => deriveBooking(it, houses)
  );
  const [house, setHouse] = useState("all");
  const [done, setDone] = useState(tasksDone);
  const [expanded, setExpanded] = useState(null);
  // Aktiver KPI-Filter (klickbare Karte): all | reserved | confirmed | draft.
  const [kpiFilter, setKpiFilter] = useState("all");

  function toggleTask(bookingId, key, value) {
    setDone((d) => ({ ...d, [bookingId]: { ...(d[bookingId] || {}), [key]: { done: value } } }));
    fetch(`/api/bookings/${bookingId}/task`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskKey: key, done: value, by: me }),
    }).catch(() => {});
  }

  // KPI-Karten doppeln als Filter: jede hat ein Kriterium (match).
  const kpis = [
    { key: "all", tone: "info", icon: "bed", label: "Buchungen", match: () => true },
    { key: "reserved", tone: "primary", icon: "flag", label: "Reserviert", match: (b) => b.status === "reserved" },
    { key: "confirmed", tone: "success", icon: "check", label: "Bestätigt", match: (b) => b.status === "confirmed" },
    { key: "draft", tone: "warn", icon: "doc", label: "Verträge offen", match: (b) => b.contractStatus === "draft" },
  ].map((k) => ({ ...k, val: items.filter(k.match).length }));
  const activeKpi = kpis.find((k) => k.key === kpiFilter) || kpis[0];

  const houseNames = [...new Set(items.map((b) => b.house))];
  const shown = items.filter((b) => (house === "all" || b.house === house) && activeKpi.match(b));

  // nach Haus gruppieren (für die gefilterte Menge)
  const groups = [...new Set(shown.map((b) => b.house))].map((h) => ({
    house: h,
    items: shown.filter((b) => b.house === h),
  }));

  return (
    <div className="dash-wrap db-scroll">
      <div className="dash-inner">
        <div className="db-kicker" style={{ color: "var(--db-primary)" }}>Schritt 2 — Buchungen verwalten</div>
        <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2 }}>Buchungen · Hausmanager</h1>
        <p className="db-muted" style={{ fontSize: 13, margin: "4px 0 14px", maxWidth: "62ch" }}>
          Alle angelegten Buchungen, nach Haus gruppiert. Jede entstand aus einer Anfrage im Posteingang.
        </p>

        <div className="dash-stats">
          {kpis.map((k) => (
            <StatCard
              key={k.key}
              tone={k.tone}
              icon={k.icon}
              label={k.label}
              value={k.val}
              active={kpiFilter === k.key}
              onClick={() => setKpiFilter(kpiFilter === k.key ? "all" : k.key)}
            />
          ))}
        </div>

        <div className="filter-chips" style={{ marginTop: 14 }}>
          <button className={`filter-chip ${house === "all" ? "active" : ""}`} onClick={() => setHouse("all")}>
            Alle Häuser <span className="fc-count">{items.length}</span>
          </button>
          {houseNames.map((h) => (
            <button key={h} className={`filter-chip ${house === h ? "active" : ""}`} onClick={() => setHouse(h)}>
              <span className="route-area-dot" style={{ background: areaColor(h), width: 8, height: 8 }} />
              {h} <span className="fc-count">{items.filter((b) => b.house === h).length}</span>
            </button>
          ))}
        </div>

        {items.length === 0 && (
          <div className="db-muted" style={{ textAlign: "center", padding: 40 }}>
            Noch keine Buchungen. Lege eine im{" "}
            <Link href="/posteingang" style={{ color: "var(--db-primary)", fontWeight: 600 }}>Posteingang</Link> an.
          </div>
        )}

        {items.length > 0 && shown.length === 0 && (
          <div className="db-muted" style={{ textAlign: "center", padding: 40 }}>
            Keine Buchungen für diesen Filter.{" "}
            <button className="db-link" onClick={() => { setKpiFilter("all"); setHouse("all"); }}>Filter zurücksetzen</button>
          </div>
        )}

        {groups.map((g) => (
          <div key={g.house} style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="route-area-dot" style={{ background: areaColor(g.house), width: 10, height: 10 }} />
              <h2 className="db-h2" style={{ fontSize: 15 }}>{g.house}</h2>
              <span className="db-faint" style={{ fontSize: 12 }}>· {g.items.length} Buchung{g.items.length > 1 ? "en" : ""}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.items.map((b) => {
                const st = STATUS[b.status] || { tone: "neutral", label: b.status };
                const ct = CONTRACT[b.contractStatus] || CONTRACT.draft;
                const tl = computeTimeline(b.startISO, done[b.id]);
                const card = (
                  <div className="db-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</span>
                        <Pill tone={st.tone} dot={false}>{st.label}</Pill>
                        <Pill tone={ct.tone} dot={false}>{ct.label}</Pill>
                      </div>
                      <div className="db-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {b.school && b.school !== b.title ? `${b.school} · ` : ""}
                        {b.program || "Aufenthalt"}{b.contact ? ` · ${b.contact}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{b.dates}</div>
                      <div className="db-faint" style={{ fontSize: 11.5 }}>
                        <Icon d={I.users} size={11} style={{ verticalAlign: -1 }} /> {b.people}{b.people !== "—" ? " Pers." : ""}
                      </div>
                    </div>
                    <span className="booking-actions" style={{ flexShrink: 0 }} onClick={(e) => e.preventDefault()}>
                      <button
                        className={`db-btn db-btn-sm ${expanded === b.id ? "db-btn-primary" : "db-btn-ghost"}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(expanded === b.id ? null : b.id); }}
                        title="Vorbereitung / Fristen anzeigen"
                      >
                        <Icon d={I.clock} size={12} /> Fristen
                        {tl.overdue > 0 ? <span className="tl-badge">{tl.overdue}</span> : tl.open > 0 ? ` ${tl.open}` : " ✓"}
                      </button>
                      <button
                        className="db-btn db-btn-ghost db-btn-sm"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing({ ...b }); }}
                        title="Buchung bearbeiten"
                      >
                        <Icon d={I.pencil} size={12} /> bearbeiten
                      </button>
                      <MealButton booking={b} />
                      <ContractButton booking={b} onSaveText={(text) => saveText(b.id, text)} />
                    </span>
                    {b.inquiryId && <Icon d={I.chevron} size={16} style={{ color: "var(--db-text-faint)", flexShrink: 0 }} />}
                  </div>
                );
                return (
                  <div key={b.id} className="booking-block">
                    {b.inquiryId ? <Link href={`/inquiry/${b.inquiryId}`}>{card}</Link> : card}
                    {expanded === b.id && (
                      <div className="timeline-panel">
                        <div className="tl-head"><Icon d={I.clock} size={13} /> Vorbereitung &amp; Fristen{tl.past ? " · Aufenthalt vergangen" : ""}</div>
                        {tl.tasks.map((t) => (
                          <label key={t.key} className={`tl-row ${t.done ? "done" : ""}`}>
                            <input type="checkbox" checked={t.done} onChange={(e) => toggleTask(b.id, t.key, e.target.checked)} />
                            <span className="tl-label">{t.label}</span>
                            <span className="tl-due mono">{t.dueLabel}</span>
                            {!t.done && t.hint && <Pill tone={t.tone === "neutral" ? "neutral" : t.tone} dot={t.tone === "error"}>{t.hint}</Pill>}
                            {t.done && <Pill tone="success" dot={false}>erledigt</Pill>}
                          </label>
                        ))}
                        {(() => {
                          if (tl.past) return null;
                          const openKeys = customerOpenKeys(tl.tasks.filter((t) => !t.done).map((t) => t.key));
                          if (!openKeys.length) return null;
                          const overdue = tl.tasks.some((t) => !t.done && t.tone === "error" && openKeys.includes(t.key));
                          return (
                            <div className="tl-followup">
                              <span className="db-muted" style={{ fontSize: 11.5, marginRight: "auto" }}>
                                <Icon d={I.mail} size={11} style={{ verticalAlign: -1 }} /> {openKeys.length} Info{openKeys.length > 1 ? "s" : ""} fehlt noch beim Kunden{overdue ? " · überfällig" : ""}.
                              </span>
                              <DraftButton
                                booking={b}
                                label="Nachfassen-E-Mail"
                                icon="send"
                                kind={overdue ? "primary" : "sage"}
                                title="Nachfass-E-Mail (Entwurf)"
                                build={(bk) => buildFollowUp(bk, openKeys)}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
