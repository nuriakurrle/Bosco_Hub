"use client";
// components/Inbox.js — Team-Posteingang. Receives the already-mapped inquiries
// from the server (read from Postgres) and shows them as cards.
// An "email with several bookings" arrives as several rows with the same
// conversationId; here we group them into a single card.
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill, EmptyState, HouseTag } from "@/components/ui";
import AssignControl from "@/components/AssignControl";
import { areaColor, areaLabel, suggestedPerson } from "@/lib/team";

// Group by conversation. Rows without a conversationId stand alone.
function groupItems(items) {
  const groups = [];
  const byConv = new Map();
  for (const it of items) {
    const key = it.conversationId || `single-${it.id}`;
    if (!byConv.has(key)) {
      const g = { key, items: [], primary: it };
      byConv.set(key, g);
      groups.push(g);
    }
    byConv.get(key).items.push(it);
  }
  return groups;
}

export default function Inbox({ items: initialItems, staff = [], houses = [], me, query = "", initialFilter = "all" }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState(initialFilter);
  const [toast, setToast] = useState(null);
  const [selIdx, setSelIdx] = useState(-1);
  // Live-Suche direkt über der Liste. Initial aus ?q= (teilbare Deep-Links),
  // danach rein clientseitig — kein Routing-Roundtrip pro Tastendruck.
  const [search, setSearch] = useState(query || "");
  const q = search.trim().toLowerCase();

  // Server-Daten nachziehen (Auto-Refresh / nach Navigation).
  useEffect(() => setItems(initialItems), [initialItems]);

  // Filter in der URL spiegeln (teilbar, bleibt erhalten).
  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (filter && filter !== "all") p.set("filter", filter);
    const qs = p.toString();
    router.replace(`/posteingang${qs ? `?${qs}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Auto-Refresh: alle 60 s frische Daten holen.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60000);
    return () => clearInterval(id);
  }, [router]);

  // Tastatur-Flow: j/k bzw. ↑/↓ wählen, Enter öffnet.
  const rowsRef = useRef([]);
  const selRef = useRef(-1);
  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const n = rowsRef.current.length;
      if (!n) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelIdx((i) => Math.min(n - 1, i + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelIdx((i) => Math.max(0, i < 0 ? 0 : i - 1));
      } else if (e.key === "Enter") {
        const g = rowsRef.current[selRef.current];
        if (g) router.push(`/inquiry/${g.primary.id}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  async function onAssign(id, who) {
    // Optimistic: update the UI and persist to the database.
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, assignedTo: who } : it))
    );
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: who }),
      });
    } catch {
      setToast("Konnte die Zuweisung nicht speichern.");
      setTimeout(() => setToast(null), 3000);
    }
  }

  const groups = groupItems(items);

  // ── Helfer ──────────────────────────────────────────────────────────────
  const isDone = (g) => g.items.every((x) => x.trackerStatus === "booking_created");
  const areaOf = (g) => {
    const raw = g.primary.responsibleArea;
    const a = raw && areaLabel(raw) !== "—" ? raw : g.primary.house || raw;
    return areaLabel(a);
  };
  // Dringlichkeit: rot, wenn lange offen oder unzugewiesen & alt.
  const urgencyOf = (g) => {
    if (isDone(g)) return "done";
    const wd = g.primary.waitingDays || 0;
    const un = !g.primary.assignedTo;
    if (wd >= 4 || (un && wd >= 2)) return "urgent";
    if (wd >= 2) return "warn";
    return "normal";
  };
  const matchesQuery = (g) => {
    if (!q) return true;
    const i = g.primary;
    return [i.school, i.from, i.summary, i.subject].some((v) => (v || "").toLowerCase().includes(q));
  };

  // ── Filter ──────────────────────────────────────────────────────────────
  let rows = groups.filter(matchesQuery);
  if (filter === "open") rows = rows.filter((g) => !isDone(g));
  else if (filter === "booking") rows = rows.filter((g) => g.primary.emailType === "booking");
  else if (filter === "email") rows = rows.filter((g) => g.primary.channel === "email");
  else if (filter === "phone") rows = rows.filter((g) => g.primary.channel === "phone");
  else if (filter === "unassigned") rows = rows.filter((g) => !g.primary.assignedTo);
  else if (filter === "mine") rows = rows.filter((g) => g.primary.assignedTo === me);
  else if (filter === "urgent") rows = rows.filter((g) => urgencyOf(g) === "urgent");
  else if (filter.startsWith("person:")) rows = rows.filter((g) => g.primary.assignedTo === filter.slice(7));
  else if (filter.startsWith("area:")) rows = rows.filter((g) => areaOf(g) === filter.slice(5));

  // "Nichts rutscht runter": erledigte ganz nach unten, dann Dringlichkeit, dann älteste.
  const URG_RANK = { urgent: 0, warn: 1, normal: 2, done: 3 };
  rows = [...rows].sort((a, b) => {
    const ra = URG_RANK[urgencyOf(a)], rb = URG_RANK[urgencyOf(b)];
    if (ra !== rb) return ra - rb;
    return (b.primary.waitingDays || 0) - (a.primary.waitingDays || 0);
  });

  // Tastatur-Refs aktuell halten + Auswahl-Key.
  rowsRef.current = rows;
  selRef.current = selIdx;
  const selectedKey = selIdx >= 0 && selIdx < rows.length ? rows[selIdx].key : null;

  // ── Aggregate (für KPIs + Seitenleiste) ─────────────────────────────────
  const open = groups.filter((g) => !isDone(g));
  const nEmail = groups.filter((g) => g.primary.channel === "email").length;
  const nPhone = groups.filter((g) => g.primary.channel === "phone").length;
  const nUnassigned = groups.filter((g) => !g.primary.assignedTo).length;
  const nBooking = groups.filter((g) => g.primary.emailType === "booking").length;
  const nUrgent = groups.filter((g) => urgencyOf(g) === "urgent").length;

  const teamLoad = staff.map((s) => ({ ...s, n: open.filter((g) => g.primary.assignedTo === s.key).length }));
  const loadByKey = Object.fromEntries(teamLoad.map((t) => [t.key, t.n]));
  const areaCounts = {};
  // Alle Häuser/Bereiche zeigen — auch ohne offene Anfragen (z. B. Zeltplatz).
  houses.forEach((h) => {
    const l = areaLabel(h.name);
    if (l && l !== "—") areaCounts[l] = 0;
  });
  open.forEach((g) => {
    const l = areaOf(g);
    if (l && l !== "—") areaCounts[l] = (areaCounts[l] || 0) + 1;
  });
  const oldestList = [...open]
    .filter((g) => urgencyOf(g) !== "normal")
    .sort((a, b) => (b.primary.waitingDays || 0) - (a.primary.waitingDays || 0))
    .slice(0, 4);

  // KPI-Karten = primäre Status-Filter (klicken filtert, erneut klicken = alle).
  const KPI_CARDS = [
    { k: "all", tone: "info", icon: "mail", label: "Alle E-Mails", val: groups.length },
    { k: "urgent", tone: "error", icon: "alert", label: "Dringend", val: nUrgent },
    { k: "unassigned", tone: "warn", icon: "flag", label: "Nicht zugewiesen", val: nUnassigned },
    { k: "booking", tone: "success", icon: "bed", label: "Buchungen", val: nBooking },
  ];

  // Eine Anfrage-Karte (wiederverwendet in flacher Liste und Gruppen).
  function renderCard(g) {
    const i = g.primary;
    const multi = g.items.length > 1;
    const done = isDone(g);
    const missing = i.fields.filter((f) => f.status === "missing").length;
    const rawArea = i.responsibleArea;
    const area = rawArea && areaLabel(rawArea) !== "—" ? rawArea : i.house || rawArea;
    const suggest = suggestedPerson(area, staff);
    return (
      <div
        key={g.key}
        className={`db-card inbox-card urg-${urgencyOf(g)} ${g.key === selectedKey ? "selected" : ""}`}
        style={{ padding: 0, cursor: "pointer", overflow: "hidden" }}
        onClick={() => router.push(`/inquiry/${i.id}`)}
      >
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <div
            className="ch-rail"
            style={{
              background: i.channel === "phone" ? "var(--db-primary-tint)" : "var(--db-info-tint)",
              color: i.channel === "phone" ? "var(--db-primary)" : "var(--db-info)",
            }}
          >
            <Icon d={i.channel === "phone" ? I.phone : I.mail} size={18} />
            <span className="ch-rail-label">{i.channel === "phone" ? "Telefon" : "E-Mail"}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0, padding: "16px" }}>
            {/* Name zuerst (Kanal zeigt das Icon in der Leiste links) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 16, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {i.school}
              </span>
              <span style={{ marginLeft: "auto", flexShrink: 0 }}>
                {done ? (
                  <Pill tone="success">Buchung angelegt</Pill>
                ) : multi ? (
                  <Pill tone="burgundy" dot={false}>{g.items.length} Anfragen erkannt</Pill>
                ) : missing > 0 ? (
                  <Pill tone="warn">{missing} Feld{missing > 1 ? "er" : ""} fehlt</Pill>
                ) : (
                  <Pill tone="info">Neu · bereit</Pill>
                )}
              </span>
            </div>
            <div
              className="db-muted"
              style={{ fontSize: 14, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {i.from} — {i.summary}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span className="db-faint" style={{ fontSize: 12 }}>{i.received}</span>
              {!done && i.waitingDays >= 2 && (
                <Pill tone={i.waitingDays >= 4 ? "error" : "warn"} dot={false}>
                  <Icon d={I.clock} size={10} /> seit {i.waitingDays} Tagen offen
                </Pill>
              )}
            </div>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              flexShrink: 0,
              width: 196,
              borderLeft: "1px solid var(--db-line)",
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <HouseTag area={area} />
            <AssignControl id={i.id} who={i.assignedTo} suggest={suggest} onAssign={onAssign} staff={staff} me={me} loadByKey={loadByKey} />
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "0 12px", color: "var(--db-text-faint)" }}>
            <Icon d={I.chevron} size={18} />
          </div>
        </div>
      </div>
    );
  }


  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--db-bg)",
      }}
    >
      <div className="db-scroll" style={{ flex: 1, minHeight: 0 }}>
        {/* Intro — volle Breite (linke Kante wie die Suchleiste oben) */}
        <div style={{ padding: "var(--page-pad-top) var(--page-pad-x) var(--s-2)" }}>
          <div className="db-kicker" style={{ color: "var(--db-primary)" }}>
            Schritt 1 — Anfragen sammeln &amp; zuteilen
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
            <h1 className="db-h1" style={{ fontSize: 22 }}>Team-Posteingang</h1>
            <span className="db-faint" style={{ fontSize: 12 }}>Ziel: Antwort in 2 Werktagen</span>
          </div>
          <p className="db-muted" style={{ fontSize: 13, margin: "4px 0 0", maxWidth: "70ch" }}>
            E-Mail und Telefon laufen hier zusammen; dringende und nicht zugewiesene Anfragen stehen oben.
          </p>
        </div>

        {/* Schlanke, klebende Filter-Leiste — bleibt beim Scrollen oben */}
        <div className="inbox-toolbar">
          <div className="inbox-toolbar-row">
            {KPI_CARDS.map((c) => (
              <button
                key={c.k}
                className={`filter-chip ${filter === c.k ? "active" : ""}`}
                onClick={() => setFilter(filter === c.k ? "all" : c.k)}
                title={c.label}
              >
                <Icon d={I[c.icon]} size={12} /> {c.label} <span className="fc-count">{c.val}</span>
              </button>
            ))}
            <span className="inbox-toolbar-sep" />
            <button className={`filter-chip ${filter === "email" ? "active" : ""}`} onClick={() => setFilter(filter === "email" ? "all" : "email")}>
              <Icon d={I.mail} size={12} /> E-Mail <span className="fc-count">{nEmail}</span>
            </button>
            <button className={`filter-chip ${filter === "phone" ? "active" : ""}`} onClick={() => setFilter(filter === "phone" ? "all" : "phone")}>
              <Icon d={I.clock} size={12} /> Telefon <span className="fc-count">{nPhone}</span>
            </button>
            {filter !== "all" && (
              <button className="db-link" style={{ marginLeft: "auto", fontSize: 12 }} onClick={() => setFilter("all")}>
                Alle anzeigen
              </button>
            )}
          </div>
        </div>

        {/* Inhalt — volle Breite, linke Kante = Suchleiste/Kopf/Leiste (32px). */}
        <div style={{ padding: "var(--s-2) var(--page-pad-x) var(--page-pad-bottom)" }}>
        <div className="inbox-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          {/* Suchleiste — unter der Filter-Leiste, direkt über den Anfragen */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <form className="db-search inbox-search" onSubmit={(e) => e.preventDefault()} role="search">
              <Icon d={I.search} size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Schule, Kontakt, Anfrage suchen…"
                aria-label="Anfragen durchsuchen"
              />
              {search && (
                <button type="button" className="ts-clear" onClick={() => setSearch("")} aria-label="Suche löschen">
                  <Icon d={I.x} size={12} />
                </button>
              )}
            </form>
            {search && (
              <span className="db-faint" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {rows.length} Treffer
              </span>
            )}
          </div>
          {rows.length === 0 ? (
            q ? (
              <EmptyState
                icon="search"
                title="Keine Treffer"
                hint={`Für „${search}" wurde nichts gefunden. Suche anpassen oder zurücksetzen.`}
                action={<button className="db-btn db-btn-secondary db-btn-sm" onClick={() => setSearch("")}>Suche zurücksetzen</button>}
              />
            ) : filter !== "all" ? (
              <EmptyState
                icon="inbox"
                title="Nichts in diesem Filter"
                hint="In diesem Filter liegen gerade keine Anfragen."
                action={<button className="db-btn db-btn-secondary db-btn-sm" onClick={() => setFilter("all")}>Alle anzeigen</button>}
              />
            ) : (
              <EmptyState
                icon="inbox"
                title="Posteingang ist leer"
                hint="Neue Anfragen aus E-Mail (über n8n) und Telefon erscheinen hier automatisch."
              />
            )
          ) : (
            // Einheitliche Ordnung: EINE konsistent sortierte Liste in jedem Filter
            // (Dringlichkeit, dann älteste zuerst) — keine wechselnde Abschnitts-Gruppierung.
            rows.map(renderCard)
          )}
          </div>

          {/* Triage-Seitenleiste */}
          <aside className="inbox-aside">
            <div className="aside-card primary">
              <div className="aside-title"><Icon d={I.users} size={13} /> Zuteilen · Team-Last</div>
              {(() => {
                const maxLoad = Math.max(1, nUnassigned, ...teamLoad.map((t) => t.n));
                return (
                  <>
                    <button
                      className={`aside-row ${filter === "unassigned" ? "active" : ""}`}
                      onClick={() => setFilter("unassigned")}
                    >
                      <span className="avatar sm" style={{ background: "var(--db-warn-tint)", color: "#7a4a14" }}>?</span>
                      <span className="aside-name">Nicht zugewiesen</span>
                      <span className="aside-bar-track"><span className="aside-bar warn" style={{ width: `${(nUnassigned / maxLoad) * 100}%` }} /></span>
                      <span className="mono aside-n">{nUnassigned}</span>
                    </button>
                    {teamLoad.map((t) => (
                      <button
                        key={t.key}
                        className={`aside-row ${filter === `person:${t.key}` ? "active" : ""}`}
                        onClick={() => setFilter(`person:${t.key}`)}
                      >
                        <span className="avatar sm">{t.short}</span>
                        <span className="aside-name">{t.name}{t.key === me ? " (ich)" : ""}</span>
                        <span className="aside-bar-track"><span className="aside-bar" style={{ width: `${(t.n / maxLoad) * 100}%` }} /></span>
                        <span className="mono aside-n">{t.n}</span>
                      </button>
                    ))}
                  </>
                );
              })()}
            </div>

            <div className="aside-card">
              <div className="aside-title"><Icon d={I.house} size={13} /> Nach Bereich</div>
              <div className="aside-chips">
                {Object.entries(areaCounts).length === 0 && <span className="db-faint" style={{ fontSize: 12 }}>—</span>}
                {Object.entries(areaCounts).map(([label, n]) => (
                  <button
                    key={label}
                    className={`aside-chip ${filter === `area:${label}` ? "active" : ""}`}
                    onClick={() => setFilter(`area:${label}`)}
                  >
                    <span className="route-area-dot" style={{ background: areaColor(label) }} />
                    {label} <span className="aside-chip-n">{n}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="aside-card">
              <div className="aside-title"><Icon d={I.clock} size={13} /> Am längsten offen</div>
              {oldestList.length === 0 && <div className="db-muted" style={{ fontSize: 12, padding: "4px 2px" }}>Alles aktuell ✓</div>}
              {oldestList.map((g) => (
                <button
                  key={g.key}
                  className="aside-row"
                  onClick={() => router.push(`/inquiry/${g.primary.id}`)}
                >
                  <span
                    className={`urgency-dot ${urgencyOf(g)}`}
                    title={urgencyOf(g) === "urgent" ? "dringend" : urgencyOf(g) === "warn" ? "wird älter" : "offen"}
                  />
                  <span className="aside-name">{g.primary.school}</span>
                  <span className="mono aside-n">{g.primary.waitingDays}d</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            zIndex: 50,
            background: "var(--db-error)",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
