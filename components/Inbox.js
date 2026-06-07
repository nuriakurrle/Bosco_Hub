"use client";
// components/Inbox.js — Team-Posteingang. Recibe las inquiries ya mapeadas
// desde el servidor (leídas de Postgres) y las muestra como tarjetas.
// Una "email con varias reservas" llega como varias filas con el mismo
// conversationId; aquí las agrupamos en una sola tarjeta.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill } from "@/components/ui";
import AssignControl from "@/components/AssignControl";
import { areaColor, areaLabel, suggestedPerson } from "@/lib/team";

// Agrupa por conversación. Las filas sin conversationId quedan solas.
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

export default function Inbox({ items: initialItems, staff = [], me }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);

  async function onAssign(id, who) {
    // Optimista: actualiza la UI y persiste en la base de datos.
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

  // Filtros
  let rows = groups;
  if (filter === "email") rows = rows.filter((g) => g.primary.channel === "email");
  if (filter === "phone") rows = rows.filter((g) => g.primary.channel === "phone");
  if (filter === "unassigned") rows = rows.filter((g) => !g.primary.assignedTo);
  if (filter === "mine") rows = rows.filter((g) => g.primary.assignedTo === me);

  const nEmail = groups.filter((g) => g.primary.channel === "email").length;
  const nPhone = groups.filter((g) => g.primary.channel === "phone").length;
  const nUnassigned = groups.filter((g) => !g.primary.assignedTo).length;
  const nMine = groups.filter((g) => g.primary.assignedTo === me).length;

  const chips = [
    ["all", "Alle", groups.length],
    ["unassigned", "Nicht zugewiesen", nUnassigned],
    ["mine", "Mir zugewiesen", nMine],
    ["email", "E-Mail", nEmail],
    ["phone", "Telefon", nPhone],
  ];

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
      <div style={{ padding: "20px 26px 14px", maxWidth: 1000, width: "100%", margin: "0 auto" }}>
        <div className="db-kicker" style={{ color: "var(--db-primary)" }}>
          Schritt 1 — Anfragen sammeln &amp; zuteilen
        </div>
        <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2 }}>
          Team-Posteingang
        </h1>
        <p className="db-muted" style={{ fontSize: 13, margin: "4px 0 0", maxWidth: "62ch" }}>
          E-Mail und Telefon landen hier zusammen. Der n8n-Agent liest jede Anfrage, schlägt
          einen Bereich und eine zuständige Person vor — Sie bestätigen die Zuteilung und legen
          die Buchung an.
        </p>

        {nUnassigned > 0 && (
          <div className="await-banner" style={{ marginTop: 14 }}>
            <span className="pulse" />
            <span>
              <b>
                {nUnassigned} Anfrage{nUnassigned > 1 ? "n sind" : " ist"} noch niemandem
                zugewiesen.
              </b>{" "}
              Bitte zuteilen, damit nichts liegen bleibt.
            </span>
          </div>
        )}

        <div className="filter-chips" style={{ marginTop: 14 }}>
          {chips.map(([k, l, n]) => (
            <button
              key={k}
              className={`filter-chip ${filter === k ? "active" : ""}`}
              onClick={() => setFilter(k)}
            >
              {k === "email" && <Icon d={I.mail} size={12} />}
              {k === "phone" && <Icon d={I.clock} size={12} />}
              {k === "unassigned" && <Icon d={I.alert} size={12} />}
              {l} <span className="fc-count">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: "0 26px 26px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((g) => {
            const i = g.primary;
            const multi = g.items.length > 1;
            const isDone = g.items.every((x) => x.trackerStatus === "booking_created");
            const missing = i.fields.filter((f) => f.status === "missing").length;
            // Área: usa el routing de n8n; si vino "unassigned", cae a la casa
            // que detectó la IA, para no mostrar "—".
            const rawArea = i.responsibleArea;
            const area =
              rawArea && areaLabel(rawArea) !== "—" ? rawArea : i.house || rawArea;
            const suggest = suggestedPerson(area, staff);
            return (
              <div
                key={g.key}
                className="db-card"
                style={{ padding: 0, cursor: "pointer", overflow: "hidden" }}
                onClick={() => router.push(`/inquiry/${i.id}`)}
              >
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  {/* riel del canal */}
                  <div
                    style={{
                      width: 48,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        i.channel === "phone" ? "var(--db-primary-tint)" : "var(--db-info-tint)",
                      color: i.channel === "phone" ? "var(--db-primary)" : "var(--db-info)",
                    }}
                  >
                    <Icon d={i.channel === "phone" ? I.clock : I.mail} size={18} />
                  </div>
                  {/* contenido */}
                  <div style={{ flex: 1, minWidth: 0, padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: ".05em",
                          textTransform: "uppercase",
                          color: i.channel === "phone" ? "var(--db-primary)" : "var(--db-info)",
                        }}
                      >
                        {i.channel === "phone" ? "Telefon" : "E-Mail"}
                      </span>
                      <span className="db-faint" style={{ fontSize: 11 }}>
                        · {i.received}
                      </span>
                      {i.containsSensitiveData && (
                        <span title={i.sensitiveDataNote} style={{ display: "inline-flex" }}>
                          <Pill tone="error" dot={false}>
                            <Icon d={I.shield} size={11} /> Sensible Daten
                          </Pill>
                        </span>
                      )}
                      <span style={{ marginLeft: "auto" }}>
                        {isDone ? (
                          <Pill tone="success">Buchung angelegt</Pill>
                        ) : multi ? (
                          <Pill tone="burgundy" dot={false}>
                            {g.items.length} Anfragen erkannt
                          </Pill>
                        ) : missing > 0 ? (
                          <Pill tone="warn">
                            {missing} Feld{missing > 1 ? "er" : ""} fehlt
                          </Pill>
                        ) : (
                          <Pill tone="info">Neu · bereit</Pill>
                        )}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{i.school}</div>
                    <div
                      className="db-muted"
                      style={{
                        fontSize: 12.5,
                        marginTop: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {i.from} — {i.summary}
                    </div>
                  </div>
                  {/* routing + asignación */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flexShrink: 0,
                      width: 196,
                      borderLeft: "1px solid var(--db-line)",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      justifyContent: "center",
                    }}
                  >
                    <span className="route-chip" title={area}>
                      <span className="route-area-dot" style={{ background: areaColor(area) }} />
                      <span className="rc-house">{areaLabel(area)}</span>
                    </span>
                    <AssignControl
                      id={i.id}
                      who={i.assignedTo}
                      suggest={suggest}
                      onAssign={onAssign}
                      staff={staff}
                      me={me}
                    />
                  </div>
                  {/* chevron */}
                  <div style={{ display: "flex", alignItems: "center", padding: "0 12px", color: "var(--db-text-faint)" }}>
                    <Icon d={I.chevron} size={16} />
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="db-muted" style={{ textAlign: "center", padding: 40 }}>
              Keine Anfragen in diesem Filter.
            </div>
          )}
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
            padding: "12px 18px",
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
