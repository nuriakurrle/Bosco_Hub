"use client";
// components/SplitDetail.js — Una E-Mail que contiene varias reservas.
// n8n parte la email en varias filas (mismo conversationId); aquí las mostramos
// juntas. La verificación de disponibilidad (Platz frei / eng / voll) llega en v2
// cuando conectemos las tablas rooms/bookings, así que de momento es neutral.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill, Btn, Card } from "@/components/ui";
import AssignControl from "@/components/AssignControl";
import { suggestedPerson } from "@/lib/team";

export default function SplitDetail({ items, staff = [], me }) {
  const router = useRouter();
  const primary = items[0];
  const [done, setDone] = useState(
    () => Object.fromEntries(items.filter((x) => x.trackerStatus === "booking_created").map((x) => [x.id, true]))
  );
  const [assignedTo, setAssignedTo] = useState(primary.assignedTo);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function createOne(id) {
    setDone((d) => ({ ...d, [id]: true }));
    await fetch(`/api/inquiries/${id}/booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ created_by: me }),
    });
  }

  async function createAll() {
    const pending = items.filter((x) => !done[x.id]);
    setDone(Object.fromEntries(items.map((x) => [x.id, true])));
    await Promise.all(
      pending.map((x) =>
        fetch(`/api/inquiries/${x.id}/booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ created_by: me }),
        })
      )
    );
    showToast(`${items.length} Buchungen angelegt — je Status „Anfrage".`);
    setTimeout(() => router.push("/"), 1200);
  }

  async function onAssign(id, who) {
    setAssignedTo(who);
    await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: who }),
    });
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      {/* sub-header */}
      <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 14 }}>
        <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => router.push("/")}>
          <Icon d={I.chevron} size={13} style={{ transform: "rotate(180deg)" }} /> Posteingang
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="db-pill db-pill-info">
              <Icon d={I.mail} size={11} /> E-Mail
            </span>
            <Pill tone="burgundy" dot={false}>
              {items.length} Anfragen in 1 E-Mail
            </Pill>
          </div>
          <h1 className="serif" style={{ margin: "3px 0 0", fontSize: 21, fontWeight: 500, color: "var(--db-primary-ink)" }}>
            {primary.school}
          </h1>
        </div>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--db-text-muted)" }}>
            Zuständig:
            <AssignControl
              id={primary.id}
              who={assignedTo}
              suggest={suggestedPerson(primary.responsibleArea, staff)}
              onAssign={onAssign}
              compact
              staff={staff}
              me={me}
            />
          </span>
        </span>
      </div>

      {/* cuerpo split */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* izquierda: email */}
        <section className="db-scroll" style={{ flex: "1 1 44%", minWidth: 0, padding: 22, borderRight: "1px solid var(--db-line)" }}>
          <Card title="E-Mail" kicker={primary.receivedAbs}>
            <p style={{ fontFamily: "var(--db-font-mono)", fontSize: 11, color: "var(--db-text-faint)", marginTop: 0 }}>
              Von: {primary.from}
              {primary.customerEmail ? ` · ${primary.customerEmail}` : ""}
            </p>
            {primary.subject && <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 8px" }}>{primary.subject}</p>}
            <div className="db-email">
              {primary.rawBody ? (
                primary.rawBody.split("\n").map((line, i) => <p key={i}>{line || " "}</p>)
              ) : (
                <p className="db-muted" style={{ fontStyle: "italic" }}>
                  Kein E-Mail-Text gespeichert.
                </p>
              )}
            </div>
          </Card>
          <div style={{ marginTop: 12 }} className="await-banner">
            <Icon d={I.spark} size={16} />
            <span>
              Der Agent hat <b>{items.length} getrennte Buchungsanfragen</b> erkannt. Die
              Belegungsprüfung pro Termin folgt in v2.
            </span>
          </div>
        </section>

        {/* derecha: requests */}
        <section style={{ flex: "1 1 56%", minWidth: 0, display: "flex", flexDirection: "column", background: "var(--db-paper)" }}>
          <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="db-card-title">Erkannte Anfragen · {items.length}</div>
          </div>

          <div
            className="db-scroll"
            style={{ flex: 1, minHeight: 0, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}
          >
            {items.map((s, idx) => {
              const isDone = done[s.id];
              const personen = s.fields.find((f) => f.key === "number_of_people")?.value || "—";
              const termin = s.fields.find((f) => f.key === "date_range")?.value || "—";
              const grupo =
                s.fields.find((f) => f.key === "grade_level")?.value ||
                s.fields.find((f) => f.key === "program_type")?.value ||
                s.school;
              return (
                <div key={s.id} className="split-req ok">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="split-num">{idx + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{grupo}</span>
                    <span style={{ marginLeft: "auto" }}>
                      <Pill tone="neutral">Platz prüfen</Pill>
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div className="split-kv">
                      <span className="k">Termin</span>
                      <span className="mono">{termin}</span>
                    </div>
                    <div className="split-kv">
                      <span className="k">Personen</span>
                      <span>{personen}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 4 }}>
                    {isDone ? (
                      <span className="db-pill db-pill-success" style={{ height: 26 }}>
                        <Icon d={I.check} size={12} /> Angelegt
                      </span>
                    ) : (
                      <Btn kind="primary" size="sm" icon="check" onClick={() => createOne(s.id)}>
                        Buchung anlegen
                      </Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="db-approve-bar">
            <span className="db-muted" style={{ fontSize: 11.5 }}>
              Jede Buchung startet als Status <b>Anfrage</b>.
            </span>
            <span style={{ marginLeft: "auto" }}>
              <Btn
                kind="primary"
                size="sm"
                iconR="arrowRight"
                disabled={items.every((x) => done[x.id])}
                onClick={createAll}
              >
                Alle anlegen
              </Btn>
            </span>
          </div>
        </section>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            zIndex: 50,
            background: "var(--db-primary)",
            color: "#fbf6e9",
            padding: "12px 18px",
            borderRadius: 10,
            boxShadow: "0 8px 24px -6px rgba(40,20,25,.4)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
          }}
        >
          <Icon d={I.check} size={16} stroke={2.2} /> {toast}
        </div>
      )}
    </div>
  );
}
