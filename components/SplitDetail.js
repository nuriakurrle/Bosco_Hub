"use client";
// components/SplitDetail.js — One email containing several bookings.
// n8n splits the email into several rows (same conversationId); here we show them
// together. The availability check (Platz frei / eng / voll) comes in v2 once we
// connect the rooms/bookings tables, so for now it stays neutral.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill, Btn, Card } from "@/components/ui";
import AssignControl from "@/components/AssignControl";
import { VerdictPill, verdictMeta, CapacityMeter } from "@/components/Availability";
import { Stepper } from "@/components/HitlGate";
import EmailSource from "@/components/EmailSource";
import NotesPanel from "@/components/NotesPanel";
import { suggestedPerson } from "@/lib/team";

export default function SplitDetail({ items, staff = [], me, assessments = {}, duplicates = {}, notes = [] }) {
  const router = useRouter();
  const primary = items[0];
  const [done, setDone] = useState(
    () => Object.fromEntries(items.filter((x) => x.trackerStatus === "booking_created").map((x) => [x.id, true]))
  );
  // Pro Klasse eine eigene Freigabe (Human-in-the-loop).
  const [verified, setVerified] = useState({});
  const [assignedTo, setAssignedTo] = useState(primary.assignedTo);
  const [activeKey, setActiveKey] = useState(null);
  const [toast, setToast] = useState(null);

  const verifierName = staff.find((s) => s.key === me)?.name || me || "—";
  // Felder aller Geschwister, damit die E-Mail-Markierung alle Anfragen abdeckt.
  const allFields = items.flatMap((x) => x.fields);

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
    setTimeout(() => router.push("/posteingang"), 1200);
  }

  async function onAssign(id, who) {
    setAssignedTo(who);
    await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: who }),
    });
  }

  // Prozess-Status über alle Klassen hinweg.
  const notDone = items.filter((x) => !done[x.id]);
  const allDone = notDone.length === 0;
  const allVerified = notDone.length > 0 && notDone.every((x) => verified[x.id]);
  const splitStep = allDone ? 3 : !assignedTo ? 0 : allVerified ? 3 : 2;

  return (
    <div className="detail-view" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      {/* sub-header */}
      <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 14 }}>
        <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => router.push("/posteingang")}>
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

      {/* Prozess-Schritte */}
      <div style={{ padding: "8px 22px", borderBottom: "1px solid var(--db-line)", background: "var(--db-paper-2)" }}>
        <Stepper current={splitStep} />
      </div>

      {/* split body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* left: email */}
        <section className="db-scroll" style={{ flex: "1 1 44%", minWidth: 0, padding: 22, borderRight: "1px solid var(--db-line)" }}>
          <Card title="E-Mail" kicker={primary.receivedAbs}>
            <EmailSource
              item={primary}
              fields={allFields}
              staff={staff}
              activeKey={activeKey}
              onMarkHover={setActiveKey}
              legendCompact
            />
          </Card>
          <div style={{ marginTop: 12 }} className="await-banner">
            <Icon d={I.spark} size={16} />
            <span>
              Der Agent hat <b>{items.length} getrennte Buchungsanfragen</b> erkannt. Belegung,
              Saison und Zimmer-/Datenschutz werden pro Termin geprüft (Kapazität geschätzt).
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            <NotesPanel inquiryId={primary.id} schoolName={primary.school} me={me} initialNotes={notes} />
          </div>
        </section>

        {/* right: requests */}
        <section style={{ flex: "1 1 56%", minWidth: 0, display: "flex", flexDirection: "column", background: "var(--db-paper)" }}>
          <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="db-card-title">Erkannte Anfragen · {items.length}</div>
          </div>

          <div
            className="db-scroll"
            style={{ flex: 1, minHeight: 0, padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignContent: "start" }}
          >
            {items.map((s, idx) => {
              const isDone = done[s.id];
              const personen = s.fields.find((f) => f.key === "number_of_people")?.value || "—";
              const termin = s.fields.find((f) => f.key === "date_range")?.value || "—";
              const grupo =
                s.fields.find((f) => f.key === "grade_level")?.value ||
                s.fields.find((f) => f.key === "program_type")?.value ||
                s.school;
              const a = assessments[s.id]?.availability;
              const split = a ? verdictMeta(a.verdict).split || "" : "ok";
              return (
                <div key={s.id} className={`split-req ${split}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="split-num">{idx + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{grupo}</span>
                    <span style={{ marginLeft: "auto" }}>
                      {a ? <VerdictPill verdict={a.verdict} /> : <Pill tone="neutral">Platz prüfen</Pill>}
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
                  {a && !a.season.ok && (
                    <div className="season-banner compact">
                      <Icon d={I.alert} size={12} />
                      <span>{a.season.rule} — Termin außerhalb der Saison.</span>
                    </div>
                  )}
                  {a?.capacity && <CapacityMeter capacity={a.capacity} />}
                  {a?.alternatives?.length > 0 && (
                    <div className="split-alt mono">
                      <Icon d={I.spark} size={11} /> Alt.: {a.alternatives[0].label}
                    </div>
                  )}
                  {duplicates[s.id] && (
                    <div className="split-alt" style={{ color: "var(--db-warn)" }}>
                      <Icon d={I.link} size={11} /> ähnelt Buchung #{duplicates[s.id].booking.id}
                    </div>
                  )}
                  <div style={{ marginTop: "auto", paddingTop: 4 }}>
                    {isDone ? (
                      <span className="db-pill db-pill-success" style={{ height: 26 }}>
                        <Icon d={I.check} size={12} /> Angelegt
                      </span>
                    ) : (
                      <>
                        <label className="verify-row compact">
                          <input
                            type="checkbox"
                            checked={!!verified[s.id]}
                            onChange={(e) => setVerified((v) => ({ ...v, [s.id]: e.target.checked }))}
                          />
                          <span>geprüft &amp; freigeben</span>
                        </label>
                        <Btn
                          kind="primary"
                          size="sm"
                          icon="check"
                          disabled={!verified[s.id]}
                          style={!verified[s.id] ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                          onClick={() => verified[s.id] && createOne(s.id)}
                        >
                          Buchung anlegen
                        </Btn>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="db-approve-bar">
            {allVerified ? (
              <Pill tone="success">
                <Icon d={I.check} size={11} /> Alle freigegeben von {verifierName.split(" ")[0]}
              </Pill>
            ) : (
              <Pill tone="warn" dot={false}>
                {notDone.filter((x) => !verified[x.id]).length} von {notDone.length} noch nicht freigegeben
              </Pill>
            )}
            <span className="db-muted" style={{ fontSize: 11.5 }}>
              Jede Klasse einzeln prüfen &amp; freigeben — dann anlegen.
            </span>
            <span style={{ marginLeft: "auto" }}>
              <Btn
                kind="primary"
                size="sm"
                iconR="arrowRight"
                disabled={allDone || !allVerified}
                style={allDone || !allVerified ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                onClick={() => allVerified && createAll()}
              >
                Alle freigegebenen anlegen
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
