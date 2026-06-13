"use client";
// components/BookingsView.js — Buchungen (Hausmanager). Aufgewertet: breites,
// konsistentes Layout mit KPI-Zeile, Haus-Filter und Vertrags-Status je Buchung.
import { useState } from "react";
import Link from "next/link";
import { Icon, I } from "@/components/icons";
import { Pill } from "@/components/ui";
import ContractButton from "@/components/ContractDraft";
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

export default function BookingsView({ bookings }) {
  const [house, setHouse] = useState("all");

  const houses = [...new Set(bookings.map((b) => b.house))];
  const shown = house === "all" ? bookings : bookings.filter((b) => b.house === house);

  const kpis = [
    { tone: "info", label: "Buchungen", val: bookings.length },
    { tone: "primary", label: "Reserviert", val: bookings.filter((b) => b.status === "reserved").length },
    { tone: "success", label: "Bestätigt", val: bookings.filter((b) => b.status === "confirmed").length },
    { tone: "warn", label: "Verträge offen", val: bookings.filter((b) => b.contractStatus === "draft").length },
  ];
  const INK = { info: "var(--db-info)", primary: "var(--db-primary)", success: "var(--db-success)", warn: "var(--db-warn)" };

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
          {kpis.map((k, idx) => (
            <div key={idx} className="stat-card" style={{ background: "var(--db-paper)", borderLeft: `3px solid ${INK[k.tone]}` }}>
              <div className="stat-value" style={{ color: INK[k.tone], fontSize: 26 }}>{k.val}</div>
              <div className="stat-sub">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="filter-chips" style={{ marginTop: 14 }}>
          <button className={`filter-chip ${house === "all" ? "active" : ""}`} onClick={() => setHouse("all")}>
            Alle Häuser <span className="fc-count">{bookings.length}</span>
          </button>
          {houses.map((h) => (
            <button key={h} className={`filter-chip ${house === h ? "active" : ""}`} onClick={() => setHouse(h)}>
              <span className="route-area-dot" style={{ background: areaColor(h), width: 8, height: 8 }} />
              {h} <span className="fc-count">{bookings.filter((b) => b.house === h).length}</span>
            </button>
          ))}
        </div>

        {bookings.length === 0 && (
          <div className="db-muted" style={{ textAlign: "center", padding: 40 }}>
            Noch keine Buchungen. Lege eine im{" "}
            <Link href="/posteingang" style={{ color: "var(--db-primary)", fontWeight: 600 }}>Posteingang</Link> an.
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
                        <Icon d={I.users} size={11} style={{ verticalAlign: -1 }} /> {b.people}
                      </div>
                    </div>
                    <span style={{ flexShrink: 0 }}><ContractButton booking={b} /></span>
                    {b.inquiryId && <Icon d={I.chevron} size={16} style={{ color: "var(--db-text-faint)", flexShrink: 0 }} />}
                  </div>
                );
                return b.inquiryId ? (
                  <Link key={b.id} href={`/inquiry/${b.inquiryId}`}>{card}</Link>
                ) : (
                  <div key={b.id}>{card}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
