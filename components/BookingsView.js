"use client";
// components/BookingsView.js — Buchungen (Hausmanager). Aufgewertet: breites,
// konsistentes Layout mit KPI-Zeile, Haus-Filter und Vertrags-Status je Buchung.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill, StatCard, ContractBadge } from "@/components/ui";
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
  const router = useRouter();
  const { items, editing, setEditing, setField, saveDetails, saveText } = useBookingEdit(
    bookings,
    (it) => deriveBooking(it, houses)
  );
  const [house, setHouse] = useState("all");
  const [done, setDone] = useState(tasksDone);
  const [expanded, setExpanded] = useState(null);
  // Buchung, deren Aktions-Menü („⋯") gerade offen ist (oder null).
  const [menuId, setMenuId] = useState(null);
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
  // „Belegungs-Linse": Buchungen / Reserviert / Bestätigt.
  const kpis = [
    { key: "all", tone: "info", icon: "bed", label: "Buchungen", match: () => true },
    { key: "reserved", tone: "primary", icon: "flag", label: "Reserviert", match: (b) => b.status === "reserved" },
    { key: "confirmed", tone: "success", icon: "check", label: "Bestätigt", match: (b) => b.status === "confirmed" },
  ].map((k) => ({ ...k, val: items.filter(k.match).length }));
  const activeKpi = kpis.find((k) => k.key === kpiFilter) || kpis[0];
  // EINE Datenquelle für „Entwurf nötig" (identisch zur Verträge-Seite): hier nur
  // read-only als Hinweis. Erledigt wird der Vertrag auf der Verträge-Seite —
  // die Karte verlinkt dorthin, vorgefiltert. Keine zweite parallele Zählung.
  const contractsNeedingDraft = items.filter((b) => b.contractStatus === "draft").length;

  // Alle Häuser im Filter zeigen (auch ohne Buchungen, z. B. Zeltplatz), plus
  // evtl. „Ohne Haus" aus den Buchungen.
  const houseNames = [...new Set([...houses.map((h) => h.name), ...items.map((b) => b.house)])];
  const shown = items.filter((b) => (house === "all" || b.house === house) && activeKpi.match(b));

  // nach Haus gruppieren (für die gefilterte Menge)
  const groups = [...new Set(shown.map((b) => b.house))].map((h) => ({
    house: h,
    items: shown.filter((b) => b.house === h),
  }));

  return (
    <div className="dash-wrap db-scroll">
      <div className="dash-inner">
        <div className="db-kicker" style={{ color: "var(--db-primary)" }}>Schritt 2 — Belegung &amp; Logistik</div>
        <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d={I.bed} size={20} /> Buchungen · Hausmanager
        </h1>
        <p className="db-muted" style={{ fontSize: 13, margin: "4px 0 14px", maxWidth: "62ch" }}>
          <b>Was ist gebucht?</b> Alle Aufenthalte nach Haus gruppiert — Zeitraum, Nächte und Personenzahl im Blick.
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
          {/* Read-only Cross-Reference → Verträge (vorgefiltert). Der Pfeil (arrow)
              + Hover signalisieren „führt weg". Kein sub → gleiche Kartenhöhe wie
              die Verträge-Seite (sonst streckt die Sub-Zeile die ganze Reihe). */}
          <StatCard
            tone={contractsNeedingDraft > 0 ? "warn" : "neutral"}
            icon="doc"
            label="Entwurf nötig"
            value={contractsNeedingDraft}
            arrow
            onClick={() => router.push("/vertraege?focus=draft")}
          />
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
              <h2 className="db-h2" style={{ fontSize: 16 }}>{g.house}</h2>
              <span className="db-faint" style={{ fontSize: 12 }}>· {g.items.length} Buchung{g.items.length > 1 ? "en" : ""}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.items.map((b) => {
                const st = STATUS[b.status] || { tone: "neutral", label: b.status };
                const tl = computeTimeline(b.startISO, done[b.id]);
                const nights = b.days ? b.days - 1 : null;
                const card = (
                  <div className="db-card booking-card">
                    <div className="bk-main">
                      <div className="bk-titles">
                        <span className="bk-title">{b.title}</span>
                        <Pill tone={st.tone} dot={false}>{st.label}</Pill>
                      </div>
                      <div className="bk-meta">
                        <span>
                          {b.school && b.school !== b.title ? `${b.school} · ` : ""}
                          {b.program || "Aufenthalt"}{b.contact ? ` · ${b.contact}` : ""}
                        </span>
                        <ContractBadge status={b.contractStatus} prefix />
                      </div>
                    </div>
                    {/* Aufenthalts-Block: der Belegungs-Fokus dieser Seite */}
                    <div className="bk-stay">
                      <span className="bk-stay-dates">{b.dates}</span>
                      <span className="bk-stay-sub">
                        {nights != null && <span>{nights} {nights === 1 ? "Nacht" : "Nächte"}</span>}
                        <span className="bk-people"><Icon d={I.users} size={12} /> {b.people}{b.people !== "—" ? " Pers." : ""}</span>
                      </span>
                    </div>
                    <span className="booking-actions" style={{ flexShrink: 0, position: "relative" }} onClick={(e) => e.preventDefault()}>
                      <button
                        className={`db-btn db-btn-sm ${expanded === b.id ? "db-btn-primary" : "db-btn-ghost"}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(expanded === b.id ? null : b.id); }}
                        title="Vorbereitung / Fristen anzeigen"
                      >
                        <Icon d={I.clock} size={12} /> Fristen
                        {tl.overdue > 0 ? (
                          <span className="tl-badge" title={`${tl.overdue} überfällig`}>{tl.overdue} überfällig</span>
                        ) : tl.open > 0 ? (
                          <span style={{ marginLeft: 3 }}>· {tl.open} offen</span>
                        ) : (
                          <span style={{ marginLeft: 3 }}>· erledigt</span>
                        )}
                      </button>
                      <button
                        className={`db-btn db-btn-sm ${menuId === b.id ? "db-btn-primary" : "db-btn-ghost"}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuId(menuId === b.id ? null : b.id); }}
                        title="Weitere Aktionen"
                      >
                        <Icon d={I.more} size={14} />
                      </button>
                      {menuId === b.id && (
                        <>
                          <div
                            className="booking-menu-overlay"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuId(null); }}
                          />
                          <div className="booking-menu" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <button
                              className="db-btn db-btn-ghost db-btn-sm"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuId(null); setEditing({ ...b }); }}
                            >
                              <Icon d={I.pencil} size={12} /> Bearbeiten
                            </button>
                            <MealButton booking={b} />
                            <ContractButton booking={b} onSaveText={(text) => saveText(b.id, text)} />
                          </div>
                        </>
                      )}
                    </span>
                    {b.inquiryId && <Icon d={I.chevron} size={16} style={{ color: "var(--db-text-faint)", flexShrink: 0 }} />}
                  </div>
                );
                return (
                  <div key={b.id} className="booking-block">
                    {b.inquiryId ? (
                      // Kein <a>/<Link>: sonst lösen Klicks in den Karten-Modals (Küche,
                      // Vertrag) die native Anchor-Navigation aus (stopPropagation stoppt
                      // nur den Next-Router, nicht den Browser). Mit onClick reicht das
                      // stopPropagation der Aktionen, um ungewollte Sprünge zu verhindern.
                      <div
                        role="link"
                        tabIndex={0}
                        style={{ cursor: "pointer" }}
                        onClick={() => router.push(`/inquiry/${b.inquiryId}`)}
                        onKeyDown={(e) => { if (e.key === "Enter") router.push(`/inquiry/${b.inquiryId}`); }}
                      >
                        {card}
                      </div>
                    ) : (
                      card
                    )}
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
                              <span className="db-muted" style={{ fontSize: 12, marginRight: "auto" }}>
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
