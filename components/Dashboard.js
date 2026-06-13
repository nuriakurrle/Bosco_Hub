// components/Dashboard.js — Übersicht-Seite (Startseite). Layout angelehnt an
// gängige Management-Dashboards (Stat-Karten + Donut + Linien-Chart +
// Aktivitäten + Auslastung), aber gefüllt mit den echten ZUK-Daten.
import Link from "next/link";
import { Icon, I } from "@/components/icons";
import { Pill, Card } from "@/components/ui";
import { Donut, AreaLine } from "@/components/Charts";

const TINT = {
  info: "var(--db-info-tint)",
  warn: "var(--db-warn-tint)",
  success: "var(--db-success-tint)",
  primary: "var(--db-primary-tint)",
};
const INK = {
  info: "var(--db-info)",
  warn: "var(--db-warn)",
  success: "var(--db-success)",
  primary: "var(--db-primary)",
};

function StatCard({ tone, icon, label, value, sub }) {
  return (
    <div className="stat-card" style={{ background: TINT[tone] }}>
      <div className="stat-ico" style={{ background: INK[tone] }}>
        <Icon d={I[icon]} size={18} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: INK[tone] }}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

const STATUS_META = {
  ready_for_review: { label: "Neu", tone: "info" },
  needs_info: { label: "Info fehlt", tone: "warn" },
  booking_created: { label: "Gebucht", tone: "success" },
};

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

export default function Dashboard({ data }) {
  const { kpis, statusDonut, totalInquiries, series, houses, recent, team } = data;
  const maxTeam = Math.max(1, ...team.map((t) => t.open));
  const xLabels = series.length
    ? [series[0].label, series[Math.floor(series.length / 2)].label, series[series.length - 1].label]
    : [];

  return (
    <div className="dash-wrap db-scroll">
      <div className="dash-inner">
        {/* Kopf */}
        <div className="dash-head">
          <div>
            <div className="db-kicker" style={{ color: "var(--db-primary)" }}>ZUK · Belegungs-Cockpit</div>
            <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2 }}>Übersicht</h1>
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

        {/* Stat-Karten */}
        <div className="dash-stats">
          <StatCard tone="info" icon="inbox" label="Offene Anfragen" value={kpis.open}
            sub={`${kpis.unassigned} nicht zugewiesen`} />
          <StatCard tone="warn" icon="alert" label="Info fehlt" value={kpis.needsInfo}
            sub="Rückfrage nötig" />
          <StatCard tone="success" icon="bed" label="Buchungen" value={kpis.bookings}
            sub={`${kpis.guests} Gäste gesamt`} />
          <StatCard tone="primary" icon="spark" label="Neu diese Woche" value={kpis.thisWeek}
            sub={`${kpis.checkinToday} Check-in heute`} />
        </div>

        {/* Donut + Linien-Chart */}
        <div className="dash-row2">
          <Card title="Anfragen nach Status">
            <div className="donut-wrap">
              <Donut segments={statusDonut} total={totalInquiries} centerLabel="Anfragen" />
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
                <div className="mini-stat-label">Diese Woche</div>
                <div className="mini-stat-val">{kpis.thisWeek}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-label">Nicht zugewiesen</div>
                <div className="mini-stat-val" style={{ color: "var(--db-warn)" }}>{kpis.unassigned}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-label">Sensible Daten</div>
                <div className="mini-stat-val" style={{ color: "var(--db-error)" }}>{kpis.sensitive}</div>
              </div>
            </div>
            <AreaLine points={series} />
            <div className="axis-row">
              {xLabels.map((l, i) => <span key={i}>{l}</span>)}
            </div>
          </Card>
        </div>

        {/* Aktivitäten + Auslastung + Team */}
        <div className="dash-row3">
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
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      <Pill tone={st.tone} dot={false}>{st.label}</Pill>
                      <span className="db-faint" style={{ fontSize: 10.5 }}>{r.time}</span>
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
                const pct = h.ratio != null ? Math.round(h.ratio * 100) : null;
                const tone = pct == null ? "ok" : pct >= 100 ? "full" : pct >= 85 ? "tight" : "ok";
                return (
                  <div key={h.house} className="house-row">
                    <div className="house-top">
                      <span className="house-name">{h.house}</span>
                      <span className="mono house-num">
                        {h.capacity ? `${h.people}/${h.capacity}` : `${h.people}`} · {h.bookings} Buch.
                      </span>
                    </div>
                    <div className="cap-track">
                      <div className={`cap-fill ${tone}`} style={{ width: `${pct ?? 0}%` }} />
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
