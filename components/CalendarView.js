"use client";
// components/CalendarView.js — Belegungs-Kalender als Monatsraster.
// Zeigt alle Buchungen mit konkretem Zeitraum als durchgehende Mehrtages-Balken
// (eine Zeile pro Gruppe, Hausfarbe als Füllung, Vertrags-Status als Punkt).
// Vorwärts-Sicht: "wer ist wann da" — das mentale Modell des Personals.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill } from "@/components/ui";
import { areaColor } from "@/lib/team";
import { HOUSE_CAPACITY } from "@/lib/availability";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const CONTRACT_DOT = { draft: "var(--db-warn)", sent: "var(--db-info)", signed: "var(--db-success)" };

// Personal-Limit für parallele Gruppen — Interview: "fünf Referent:innen,
// im Schnitt fünf Bildungsräume parallel". Schätzwert, bis Honorarkräfte je
// Zeitraum erfasst sind (siehe Kapazität-je-Format unten).
const PARALLEL_LIMIT = 5;

// Skill-Schlüssel (staff.skills) → lesbares Format-Label.
const FORMAT_LABEL = {
  orientierung: "Orientierungstage",
  schullandheim: "Schullandheim",
  sommerfreizeit: "Sommerfreizeit",
  besinnung: "Besinnungstage",
  umwelt: "Umwelt",
  seminar: "Seminar",
  gruppenleiter: "Gruppenleiter",
};

// Auslastungs-Stufe eines Tages relativ zum Parallel-Limit.
function loadLevel(load) {
  if (load > PARALLEL_LIMIT) return "over";
  if (load === PARALLEL_LIMIT) return "full";
  if (load >= PARALLEL_LIMIT - 1) return "tight";
  return "ok";
}

// Betten-Auslastungs-Stufe relativ zur Haus-Kapazität.
function bedLevel(used, cap) {
  if (!cap) return "ok";
  const r = used / cap;
  if (r > 1) return "over";
  if (r >= 1) return "full";
  if (r >= 0.85) return "tight";
  return "ok";
}

function houseKey(name = "") {
  const h = name.toLowerCase();
  if (h.includes("jugendherberge")) return "jugendherberge";
  if (h.includes("aktionszentrum")) return "aktionszentrum";
  return null;
}

// "yyyy-mm-dd" → lokales Date (Mitternacht). Leerer/ungültiger Wert → null.
function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function dayIndex(date, weekStart) {
  return Math.round((date - weekStart) / 86400000);
}
function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDE(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// Greedy-Spurzuteilung: überlappende Balken in eigene Zeilen ("Lanes").
function packLanes(bars) {
  bars.sort((a, b) => a.cs - b.cs || b.ce - a.ce);
  const laneEnd = [];
  for (const bar of bars) {
    let lane = laneEnd.findIndex((end) => end < bar.cs);
    if (lane === -1) { lane = laneEnd.length; laneEnd.push(bar.ce); }
    else laneEnd[lane] = bar.ce;
    bar.lane = lane;
  }
  return bars;
}

export default function CalendarView({ bookings = [], houses = [], staff = [] }) {
  const router = useRouter();
  const today = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }, []);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [house, setHouse] = useState("all");
  const [metric, setMetric] = useState("groups"); // "groups" | "beds"

  // Startmonat optional aus der URL (?m=YYYY-MM) — teilbar/deep-linkbar.
  // Per useEffect (nicht im Initial-State), um Hydration-Mismatch zu vermeiden.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("m");
    if (m && /^\d{4}-\d{2}$/.test(m)) {
      const [y, mo] = m.split("-").map(Number);
      setCursor({ y, m: mo - 1 });
    }
  }, []);

  // Buchungen mit konkretem Zeitraum (Freitext-Termine lassen sich nicht platzieren).
  const dated = useMemo(
    () =>
      bookings
        .map((b) => {
          const start = parseISO(b.startDate);
          if (!start) return null;
          const end = parseISO(b.endDate) || start;
          return { ...b, _start: start, _end: end < start ? start : end };
        })
        .filter(Boolean),
    [bookings]
  );

  // 6 Wochen × 7 Tage (Montag zuerst), die den Monat überdecken.
  const weeks = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = (first.getDay() + 6) % 7; // Mo=0
    const gridStart = addDays(first, -lead);
    const out = [];
    for (let w = 0; w < 6; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) days.push(addDays(gridStart, w * 7 + d));
      out.push(days);
    }
    return out;
  }, [cursor]);

  const shown = house === "all" ? dated : dated.filter((b) => b.house === house);

  // Balken pro Woche berechnen (auf die Woche zugeschnitten + Lanes).
  const weekBars = useMemo(
    () =>
      weeks.map((days) => {
        const weekStart = days[0];
        const weekEnd = days[6];
        const bars = shown
          .filter((b) => b._start <= weekEnd && b._end >= weekStart)
          .map((b) => {
            const cs = Math.max(0, dayIndex(b._start, weekStart));
            const ce = Math.min(6, dayIndex(b._end, weekStart));
            return {
              id: b.id,
              inquiryId: b.inquiryId,
              title: b.title,
              house: b.house,
              people: b.people,
              dates: `${fmtDE(b._start)} – ${fmtDE(b._end)}`,
              contractStatus: b.contractStatus,
              cs,
              ce,
              contLeft: b._start < weekStart,
              contRight: b._end > weekEnd,
            };
          });
        return packLanes(bars);
      }),
    [weeks, shown]
  );

  const monthCount = shown.filter((b) => {
    const ms = new Date(cursor.y, cursor.m, 1);
    const me = new Date(cursor.y, cursor.m + 1, 0);
    return b._start <= me && b._end >= ms;
  }).length;

  // Betten-Kapazität gemäß Hausfilter (Schätzwerte aus lib/availability).
  const bedCapacity = useMemo(() => {
    if (house === "all") return Object.values(HOUSE_CAPACITY).reduce((s, h) => s + h.beds, 0);
    const k = houseKey(house);
    return k ? HOUSE_CAPACITY[k].beds : null;
  }, [house]);

  const present = (date) => shown.filter((b) => b._start <= date && b._end >= date);
  // Tageswert + Stufe je nach Metrik (parallele Gruppen oder belegte Betten).
  const dayValue = (date) =>
    metric === "beds"
      ? present(date).reduce((s, b) => s + (Number(b.peopleNum) || parseInt(String(b.people).match(/\d+/)?.[0] || "0", 10) || 0), 0)
      : present(date).length;
  const dayLevel = (val) => (metric === "beds" ? bedLevel(val, bedCapacity) : loadLevel(val));

  // Monatszusammenfassung: wie viele Tage sind eng / voll / überbucht.
  const monthLoadSummary = useMemo(() => {
    const ms = new Date(cursor.y, cursor.m, 1);
    const mEnd = new Date(cursor.y, cursor.m + 1, 0);
    let tight = 0, full = 0, over = 0;
    for (let d = new Date(ms); d <= mEnd; d = addDays(d, 1)) {
      const lvl = dayLevel(dayValue(d));
      if (lvl === "over") over++;
      else if (lvl === "full") full++;
      else if (lvl === "tight") tight++;
    }
    return { tight, full, over };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, shown, metric, bedCapacity]);

  // Kapazität je Format: wie viele Referent:innen können es (aus staff.skills).
  const formatCap = useMemo(() => {
    const counts = {};
    staff.forEach((s) =>
      (s.skills || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((k) => { counts[k] = (counts[k] || 0) + 1; })
    );
    return Object.entries(counts)
      .map(([k, n]) => ({ key: k, label: FORMAT_LABEL[k] || k, n }))
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  }, [staff]);
  const maxCap = Math.max(1, ...formatCap.map((f) => f.n));

  const houseNames = houses.length ? houses.map((h) => h.name) : [...new Set(dated.map((b) => b.house))];

  // Betten-Kapazität je Haus (für die Anzeige im Kopf).
  const houseCaps = houseNames
    .map((h) => ({ name: h, beds: (HOUSE_CAPACITY[houseKey(h)] || {}).beds }))
    .filter((x) => x.beds);
  const totalBeds = houseCaps.reduce((s, x) => s + x.beds, 0);

  function go(delta) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }
  function goToday() {
    setCursor({ y: today.getFullYear(), m: today.getMonth() });
  }
  function goToMonth(d) {
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  // Bei leerem Monat: nächste Belegung nach dem Monat, sonst die letzte davor
  // (respektiert den Hausfilter über `shown`).
  const jumpTarget = useMemo(() => {
    const mStart = new Date(cursor.y, cursor.m, 1);
    const mEnd = new Date(cursor.y, cursor.m + 1, 0);
    const after = shown.filter((b) => b._start > mEnd).sort((a, b) => a._start - b._start)[0];
    if (after) return { date: after._start, dir: "next" };
    const before = shown.filter((b) => b._end < mStart).sort((a, b) => b._start - a._start)[0];
    if (before) return { date: before._start, dir: "prev" };
    return null;
  }, [shown, cursor]);

  return (
    <div className="dash-wrap db-scroll">
      <div className="dash-inner" style={{ maxWidth: 1320 }}>
        <div className="db-kicker" style={{ color: "var(--db-primary)" }}>Belegung · Zeitplan</div>
        <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2 }}>Kalender</h1>
        <p className="db-muted" style={{ fontSize: 13, margin: "4px 0 10px", maxWidth: "64ch" }}>
          Alle Buchungen mit festem Zeitraum auf einen Blick — wer wann in welchem Haus ist.
          Jeder Balken ist eine Gruppe; die Farbe steht für das Haus.
        </p>

        {/* Betten-Kapazität der Häuser (Schätzwerte) */}
        {houseCaps.length > 0 && (
          <div className="db-faint" style={{ fontSize: 12, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Icon d={I.bed} size={12} style={{ verticalAlign: -2 }} />
            <span>Kapazität:</span>
            {house === "all" ? (
              <>
                {houseCaps.map((x) => (
                  <span key={x.name}>
                    <span className="route-area-dot" style={{ background: areaColor(x.name), width: 7, height: 7, marginRight: 4 }} />
                    {x.name} {x.beds}
                  </span>
                ))}
                <b>· gesamt {totalBeds} Betten</b>
              </>
            ) : (
              <b>{bedCapacity} Betten ({house})</b>
            )}
          </div>
        )}

        {/* Kopfzeile: Monatsnavigation + Hausfilter */}
        <div className="cal-head">
          <div className="cal-nav">
            <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => go(-1)} title="Vorheriger Monat">
              <Icon d={I.chevron} size={14} style={{ transform: "rotate(180deg)" }} />
            </button>
            <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => go(1)} title="Nächster Monat">
              <Icon d={I.chevron} size={14} />
            </button>
            <button className="db-btn db-btn-secondary db-btn-sm" onClick={goToday}>Heute</button>
          </div>
          <div className="cal-title">{MONTHS[cursor.m]} {cursor.y}</div>
          <span className="db-faint" style={{ fontSize: 12 }}>{monthCount} Gruppe{monthCount === 1 ? "" : "n"} in diesem Monat</span>

          <div className="filter-chips" style={{ marginLeft: "auto", alignItems: "center" }}>
            <button className={`filter-chip ${house === "all" ? "active" : ""}`} onClick={() => setHouse("all")}>
              Alle Häuser
            </button>
            {houseNames.map((h) => (
              <button key={h} className={`filter-chip ${house === h ? "active" : ""}`} onClick={() => setHouse(h)}>
                <span className="route-area-dot" style={{ background: areaColor(h), width: 8, height: 8 }} />
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Auslastungs-Hinweis + Umschalter + Monatswarnung */}
        <div className="cal-loadnote">
          <span className="cal-metric">
            <span className="db-faint" style={{ marginRight: 2 }}>Anzeige:</span>
            <button className={`cal-metric-btn ${metric === "groups" ? "active" : ""}`} onClick={() => setMetric("groups")}>Gruppen</button>
            <button className={`cal-metric-btn ${metric === "beds" ? "active" : ""}`} onClick={() => setMetric("beds")}>Betten</button>
          </span>
          <span className="db-faint">
            {metric === "beds"
              ? `Zahl je Tag = belegte Betten${bedCapacity ? ` (Kapazität ${bedCapacity})` : ""}.`
              : `Zahl je Tag = parallele Gruppen · Personal-Limit ~${PARALLEL_LIMIT}.`}
          </span>
          {monthLoadSummary.over || monthLoadSummary.full || monthLoadSummary.tight ? (
            <span className="cal-loadnote-flags">
              {monthLoadSummary.over > 0 && <Pill tone="error">{monthLoadSummary.over} Tag{monthLoadSummary.over === 1 ? "" : "e"} überbucht</Pill>}
              {monthLoadSummary.full > 0 && <Pill tone="error" dot={false}>{monthLoadSummary.full} Tag{monthLoadSummary.full === 1 ? "" : "e"} voll</Pill>}
              {monthLoadSummary.tight > 0 && <Pill tone="warn">{monthLoadSummary.tight} Tag{monthLoadSummary.tight === 1 ? "" : "e"} eng</Pill>}
            </span>
          ) : (
            <Pill tone="success" dot={false}>alle Tage im grünen Bereich</Pill>
          )}
        </div>

        {/* Raster */}
        <div className="cal-grid">
          <div className="cal-weekdays">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`cal-weekday${i >= 5 ? " we" : ""}`}>{w}</div>
            ))}
          </div>

          {weeks.map((days, wi) => (
            <div key={wi} className="cal-week">
              {/* Hintergrund: Spaltenlinien + Auslastungs-Heatmap (Zelle nach Belegung
                  eingefärbt) + Heute/Wochenend-Markierung */}
              <div className="cal-bg">
                {days.map((d, di) => {
                  const isToday = sameDay(d, today);
                  const we = di >= 5;
                  const lvl = dayLevel(dayValue(d));
                  return (
                    <div
                      key={di}
                      className={`cal-cell${we ? " we" : ""}${lvl !== "ok" ? ` load-${lvl}` : ""}${isToday ? " today" : ""}`}
                    />
                  );
                })}
              </div>
              {/* Tageszahlen + Tages-Auslastung */}
              {days.map((d, di) => {
                const dim = d.getMonth() !== cursor.m;
                const isToday = sameDay(d, today);
                const val = dayValue(d);
                const lvl = dayLevel(val);
                const tip = metric === "beds"
                  ? `${val} Betten belegt${bedCapacity ? ` von ${bedCapacity}` : ""}`
                  : `${val} Gruppe${val === 1 ? "" : "n"} parallel · Personal-Limit ~${PARALLEL_LIMIT}`;
                return (
                  <div
                    key={di}
                    className={`cal-daynum${dim ? " dim" : ""}${isToday ? " today" : ""}`}
                    style={{ gridColumn: di + 1, gridRow: 1 }}
                  >
                    <span>{d.getDate()}</span>
                    {val > 0 && (
                      <span className={`cal-load ${lvl}`} title={tip}>{val}</span>
                    )}
                  </div>
                );
              })}
              {/* Balken */}
              {weekBars[wi].map((bar) => (
                <div
                  key={bar.id}
                  className={`cal-bar${bar.contLeft ? " cont-l" : ""}${bar.contRight ? " cont-r" : ""}`}
                  style={{
                    gridColumn: `${bar.cs + 1} / ${bar.ce + 2}`,
                    gridRow: bar.lane + 2,
                    background: `color-mix(in srgb, ${areaColor(bar.house)} 16%, var(--db-paper))`,
                    borderColor: areaColor(bar.house),
                    cursor: bar.inquiryId ? "pointer" : "default",
                  }}
                  title={`${bar.title} · ${bar.house} · ${bar.dates} · ${bar.people} Pers.`}
                  onClick={() => bar.inquiryId && router.push(`/inquiry/${bar.inquiryId}`)}
                >
                  <span className="cal-bar-dot" style={{ background: CONTRACT_DOT[bar.contractStatus] || "var(--db-text-faint)" }} />
                  <span className="cal-bar-label">{bar.title}</span>
                  {bar.people !== "—" && <span className="cal-bar-num">{bar.people}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legende */}
        <div className="cal-legend">
          <span className="cal-legend-group">
            {houseNames.map((h) => (
              <span key={h} className="cal-legend-item">
                <span className="cal-legend-swatch" style={{ background: `color-mix(in srgb, ${areaColor(h)} 16%, var(--db-paper))`, borderColor: areaColor(h) }} />
                {h}
              </span>
            ))}
          </span>
          <span className="cal-legend-sep" />
          <span className="cal-legend-group">
            <span className="cal-legend-item"><span className="cal-legend-load" style={{ background: "color-mix(in srgb, var(--db-warn) 18%, transparent)" }} /> eng</span>
            <span className="cal-legend-item"><span className="cal-legend-load" style={{ background: "color-mix(in srgb, var(--db-error) 15%, transparent)" }} /> voll</span>
            <span className="cal-legend-item"><span className="cal-legend-load" style={{ background: "color-mix(in srgb, var(--db-error) 28%, transparent)" }} /> überbucht</span>
          </span>
          <span className="cal-legend-sep" />
          <span className="cal-legend-group">
            <span className="cal-legend-item"><span className="cal-bar-dot" style={{ background: CONTRACT_DOT.draft }} /> Vertrag: Entwurf</span>
            <span className="cal-legend-item"><span className="cal-bar-dot" style={{ background: CONTRACT_DOT.sent }} /> versendet</span>
            <span className="cal-legend-item"><span className="cal-bar-dot" style={{ background: CONTRACT_DOT.signed }} /> bestätigt</span>
          </span>
        </div>

        {monthCount === 0 && (
          <div style={{ textAlign: "center", padding: "18px 0 0", fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span className="db-muted">Keine Buchungen mit festem Zeitraum in {MONTHS[cursor.m]} {cursor.y}.</span>
            {jumpTarget && (
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => goToMonth(jumpTarget.date)}>
                <Icon d={I.calendar} size={12} />
                {jumpTarget.dir === "next" ? "Nächste" : "Letzte"} Belegung: {MONTHS[jumpTarget.date.getMonth()]} {jumpTarget.date.getFullYear()}
              </button>
            )}
          </div>
        )}

        {/* Kapazität je Format — wer kann was, mit Vertretungs-Warnung */}
        <div className="cal-resource">
          <div className="cal-res-head"><Icon d={I.users} size={14} /> Kapazität je Format · wer kann was</div>
          <div className="cal-res-grid">
            {formatCap.map((f) => (
              <div key={f.key} className="cal-res-row">
                <span className="cal-res-label">{f.label}</span>
                <span className="cal-res-bar-track">
                  <span className={`cal-res-bar${f.n < 2 ? " thin" : ""}`} style={{ width: `${(f.n / maxCap) * 100}%` }} />
                </span>
                <span className="cal-res-n">{f.n}</span>
                {f.n < 2 && <Pill tone="warn" dot={false}>nur 1 · keine Vertretung</Pill>}
              </div>
            ))}
            {formatCap.length === 0 && <div className="db-muted" style={{ fontSize: 12 }}>Keine Referenten-Skills hinterlegt.</div>}
          </div>
          <div className="cal-res-foot db-faint">
            Aus den hinterlegten Referenten-Skills. „Keine Vertretung" = nur eine Person kann das Format — bei Krankheit ein Ausfallrisiko.
          </div>
        </div>
      </div>
    </div>
  );
}
