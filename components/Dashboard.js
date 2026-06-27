// components/Dashboard.js — Übersicht-Seite (Startseite). Layout angelehnt an
// gängige Management-Dashboards (Stat-Karten + Donut + Linien-Chart +
// Aktivitäten + Auslastung), aber gefüllt mit den echten ZUK-Daten.
import Link from "next/link";
import { Icon, I } from "@/components/icons";
import { Pill, Card, StatCard, HouseTag } from "@/components/ui";
import { Donut, AreaLine } from "@/components/Charts";

function fmtArrival(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit" });
}
// „in X Tagen / Wochen / Monaten" bis zur Anreise.
function relDays(d) {
  if (!d) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(d) - today) / 86400000);
  if (days <= 0) return "heute";
  if (days === 1) return "morgen";
  if (days < 7) return `in ${days} Tagen`;
  if (days < 31) return `in ${Math.round(days / 7)} Wo.`;
  return `in ${Math.round(days / 30)} Mon.`;
}

const INK = {
  info: "var(--db-info)",
  warn: "var(--db-warn)",
  success: "var(--db-success)",
  primary: "var(--db-primary)",
};

const STATUS_META = {
  ready_for_review: { label: "Neu", tone: "info" },
  needs_info: { label: "Info fehlt", tone: "warn" },
  booking_created: { label: "Gebucht", tone: "success" },
};

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

export default function Dashboard({ data, me, staff = [] }) {
  const { kpis, statusDonut, totalInquiries, series, houses, recent, team,
    upcoming = [], attention = {}, sparks = {} } = data;
  // Personalisierter Kopf: Gruß + Datum.
  const meName = staff.find((s) => s.key === me)?.name?.split(/\s+/)[0] || "";
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const greeting = now.getHours() < 11 ? "Guten Morgen" : now.getHours() < 18 ? "Guten Tag" : "Guten Abend";
  // „Braucht Aufmerksamkeit" — nur, was wirklich ansteht.
  const attn = [];
  if (attention.overdueContracts > 0)
    attn.push({ icon: "alert", tone: "error", text: `${attention.overdueContracts} Vertrag${attention.overdueContracts > 1 ? "e" : ""} überfällig`, href: "/vertraege?focus=overdue" });
  if (attention.unassigned > 0)
    attn.push({ icon: "flag", tone: "warn", text: `${attention.unassigned} nicht zugewiesen`, href: "/posteingang?filter=unassigned" });
  (attention.overbookedHouses || []).forEach((h) =>
    attn.push({ icon: "alert", tone: "error", text: `${h.house} überbucht · ${h.pct}%`, href: "/kalender" }));

  const maxTeam = Math.max(1, ...team.map((t) => t.open));
  const xLabels = series.length
    ? [series[0].label, series[Math.floor(series.length / 2)].label, series[series.length - 1].label]
    : [];
  // Chart-eigene Kennzahlen (statt Redundanz zur KPI-Karte oben).
  const total14 = series.reduce((s, p) => s + p.n, 0);
  const peak14 = series.length ? Math.max(...series.map((p) => p.n)) : 0;

  return (
    <div className="dash-wrap db-scroll">
      <div className="dash-inner">
        {/* Kopf — personalisierter Gruß + Datum */}
        <div className="dash-head">
          <div>
            <div className="db-kicker" style={{ color: "var(--db-primary)", textTransform: "capitalize" }}>{dateStr}</div>
            <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2 }}>{greeting}{meName ? `, ${meName}` : ""}</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/posteingang" className="db-btn db-btn-primary">
              <Icon d={I.inbox} size={14} /> Posteingang
            </Link>
            <Link href="/buchungen" className="db-btn db-btn-secondary">
              <Icon d={I.bed} size={14} /> Buchungen
            </Link>
          </div>
        </div>

        {/* Stat-Karten — einheitliche read-only KPIs (Marken-Akzent als Left-Border,
            keine Voll-Maroon-Hero, kein dekorativer Pfeil → klar nicht klickbar). */}
        <div className="dash-stats">
          <StatCard tone="primary" icon="inbox" label="Offene Anfragen" value={kpis.open}
            sub={`${kpis.unassigned} nicht zugewiesen`} />
          <StatCard tone="warn" icon="alert" label="Info fehlt" value={kpis.needsInfo}
            sub="Rückfrage nötig" />
          <StatCard tone="success" icon="bed" label="Buchungen" value={kpis.bookings}
            sub={`${kpis.guests} Gäste gesamt`} spark={sparks.bookings} />
          <StatCard tone="primary" icon="spark" label="Neu diese Woche" value={kpis.thisWeek}
            sub={`${kpis.checkinToday} Check-in heute`} spark={sparks.inquiries} />
        </div>

        {/* Braucht Aufmerksamkeit — nur wenn etwas ansteht (klickbar zur Quelle) */}
        {attn.length > 0 && (
          <div className="dash-attention">
            <span className="da-label"><Icon d={I.alert} size={13} /> Braucht Aufmerksamkeit</span>
            {attn.map((a, i) => (
              <Link key={i} href={a.href} className={`da-chip t-${a.tone}`}>
                <Icon d={I[a.icon]} size={12} /> {a.text} <Icon d={I.chevron} size={11} />
              </Link>
            ))}
          </div>
        )}

        {/* Donut + Linien-Chart */}
        <div className="dash-row2">
          <Card title="Anfragen nach Status">
            <div className="donut-wrap">
              <Donut segments={statusDonut} total={totalInquiries} centerLabel="Anfragen" size={220} />
              <div className="donut-legend">
                {statusDonut.map((s) => (
                  <div key={s.key} className="legend-row">
                    <span className="legend-dot" style={{ background: INK[s.tone] }} />
                    <span className="legend-label">{s.label}</span>
                    <span className="legend-val mono">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Anfragen-Eingang" kicker="letzte 14 Tage">
            <div className="mini-stats">
              <div className="mini-stat">
                <div className="mini-stat-label">14 Tage gesamt</div>
                <div className="mini-stat-val">{total14}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-label">Spitze / Tag</div>
                <div className="mini-stat-val">{peak14}</div>
              </div>
            </div>
            <AreaLine points={series} />
            <div className="axis-row">
              {xLabels.map((l, i) => <span key={i}>{l}</span>)}
            </div>
          </Card>
        </div>

        {/* Anreisen + Aktivitäten + Auslastung + Team */}
        <div className="dash-row3">
          <Card title="Anstehende Anreisen" kicker="nächste Check-ins">
            {upcoming.length === 0 ? (
              <div className="db-muted" style={{ fontSize: 13, padding: "10px 2px" }}>
                Keine anstehenden Anreisen.
              </div>
            ) : (
              <div className="arrivals-list">
                {upcoming.map((u) => (
                  <Link
                    key={u.id}
                    href={u.inquiryId ? `/inquiry/${u.inquiryId}` : "/buchungen"}
                    className="arrival-row"
                  >
                    <span className="arrival-when">
                      <span className="arrival-date mono">{fmtArrival(u.start)}</span>
                      <span className="arrival-in">{relDays(u.start)}</span>
                    </span>
                    <span className="arrival-main">
                      <span className="arrival-title">{u.title}</span>
                      <HouseTag area={u.house} label={u.house} />
                    </span>
                    <span className="arrival-people mono">{u.people != null ? `${u.people} P` : "—"}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card title="Letzte Aktivitäten">
            <div className="activity-list">
              {recent.map((r) => {
                const st = STATUS_META[r.status] || { label: r.status, tone: "neutral" };
                return (
                  <Link key={r.id} href={`/inquiry/${r.id}`} className="activity-row">
                    <span className="avatar">{initials(r.who || r.school)}</span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className="act-title">{r.school}</span>
                      <span className="act-text">{r.text}</span>
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <Pill tone={st.tone} dot={false}>{st.label}</Pill>
                      <span className="db-faint" style={{ fontSize: 11 }}>{r.time}</span>
                    </span>
                  </Link>
                );
              })}
              {recent.length === 0 && <div className="db-muted" style={{ padding: 12 }}>Noch keine Anfragen.</div>}
            </div>
          </Card>

          <Card title="Auslastung je Haus" kicker="Betten · geschätzt">
            <div className="house-list">
              {houses.map((h) => {
                // Echten Prozentsatz (ungekappt) für die Überbuchungs-Erkennung.
                const pct = h.capacity ? Math.round((h.people / h.capacity) * 100) : null;
                const over = pct != null && pct > 100;
                const tone = pct == null ? "ok" : over ? "over" : pct >= 85 ? "tight" : "ok";
                return (
                  <div key={h.house} className="house-row">
                    <div className="house-top">
                      <span className="house-name">{h.house}</span>
                      <span className="mono house-num">
                        {h.capacity ? `${h.people}/${h.capacity}` : `${h.people}`} · {h.bookings} Buch.
                        {over && <Pill tone="error" dot={false}>überbucht · {pct}%</Pill>}
                      </span>
                    </div>
                    <div className="cap-track">
                      <div className={`cap-fill ${tone}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Last im Team" kicker="offene Anfragen">
            <div className="team-list">
              {team.map((t) => (
                <div key={t.short} className="team-row">
                  <span className="avatar sm">{t.short}</span>
                  <span className="team-name">{t.name}</span>
                  <div className="team-bar-track">
                    <div className="team-bar" style={{ width: `${(t.open / maxTeam) * 100}%` }} />
                  </div>
                  <span className="mono team-num">{t.open}</span>
                </div>
              ))}
              {team.length === 0 && <div className="db-muted" style={{ padding: 12 }}>Kein Team.</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
