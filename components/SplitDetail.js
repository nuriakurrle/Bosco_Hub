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
import { VerdictPill, verdictMeta, CapacityMeter, AvailabilityCard, SafetyGate } from "@/components/Availability";
import { Stepper, VerifyGate, MissingSummary, DuplicateBanner, nowTime } from "@/components/HitlGate";
import EmailSource from "@/components/EmailSource";
import NotesPanel from "@/components/NotesPanel";
import FollowUpPanel from "@/components/FollowUpPanel";
import ConfirmationPanel from "@/components/ConfirmationPanel";
import { suggestedPerson } from "@/lib/team";
import { buildSplitFollowUp } from "@/lib/followup";
import { buildSplitConfirmation } from "@/lib/confirmation";

export default function SplitDetail({ items, staff = [], me, assessments = {}, duplicates = {}, notes = [] }) {
  const router = useRouter();
  const primary = items[0];
  const [done, setDone] = useState(
    () => Object.fromEntries(items.filter((x) => x.trackerStatus === "booking_created").map((x) => [x.id, true]))
  );
  // Pro Klasse eine eigene Freigabe (Human-in-the-loop).
  const [verified, setVerified] = useState({});
  // Zeitstempel der Freigabe je Klasse (für die Audit-Zeile).
  const [verifiedAtBy, setVerifiedAtBy] = useState({});
  // „Trotzdem fortfahren" trotz fehlender Pflicht-Angaben, je Klasse.
  const [missingConfirmedBy, setMissingConfirmedBy] = useState({});
  const [assignedTo, setAssignedTo] = useState(primary.assignedTo);
  const [activeKey, setActiveKey] = useState(null);
  const [toast, setToast] = useState(null);
  // Editierbare Felder je Klasse (jede Klasse hat eigene Anforderungen).
  const [fieldsByItem, setFieldsByItem] = useState(
    () => Object.fromEntries(items.map((x) => [x.id, x.fields]))
  );
  // Welche Klasse ist zur Detail-/Bearbeitungsansicht aufgeklappt (oder null).
  const [expanded, setExpanded] = useState(null);
  // Gerade editiertes Feld: { itemId, fieldId } oder null.
  const [editing, setEditing] = useState(null);

  const verifierName = staff.find((s) => s.key === me)?.name || me || "—";
  // Felder aller Geschwister, damit die E-Mail-Markierung alle Anfragen abdeckt.
  const allFields = Object.values(fieldsByItem).flat();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Freigabe einer Klasse umschalten (mit Audit-Zeitstempel).
  function toggleVerify(itemId, v) {
    setVerified((prev) => ({ ...prev, [itemId]: v }));
    setVerifiedAtBy((prev) => ({ ...prev, [itemId]: v ? nowTime() : null }));
  }

  // Ein „review"-Feld einer Klasse bestätigen.
  function verifyField(itemId, fieldId) {
    setFieldsByItem((prev) => ({
      ...prev,
      [itemId]: prev[itemId].map((f) => (f.id === fieldId ? { ...f, status: "verified" } : f)),
    }));
  }

  // Bearbeitetes Feld in die DB schreiben (Spalte = field.key, je Anfrage-Zeile).
  async function saveField(itemId, fieldId, val) {
    const field = fieldsByItem[itemId]?.find((f) => f.id === fieldId);
    setFieldsByItem((prev) => ({
      ...prev,
      [itemId]: prev[itemId].map((f) =>
        f.id === fieldId ? { ...f, value: val, status: val ? "verified" : "missing" } : f
      ),
    }));
    setEditing(null);
    if (field?.key) {
      try {
        await fetch(`/api/inquiries/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field.key]: val }),
        });
      } catch {
        showToast("Konnte das Feld nicht speichern.");
      }
    }
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

  // Anfragen mit aktuellem (ggf. bearbeitetem) Feldstand — für die Sammel-Mails.
  const itemsLive = items.map((it) => ({ ...it, fields: fieldsByItem[it.id] || it.fields }));
  const missingByItem = Object.fromEntries(
    items.map((it) => [it.id, (fieldsByItem[it.id] || []).filter((f) => f.status === "missing")])
  );
  const allMissing = Object.values(missingByItem).flat();

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

          {/* E-Mails an den Kunden — EINE Mail an die Schule für alle Klassen */}
          <div style={{ marginTop: 14 }}>
            <div className="det-section-head"><Icon d={I.mail} size={12} /> E-Mails an den Kunden</div>
            <div className="db-faint" style={{ fontSize: 11.5, margin: "-2px 0 4px" }}>
              Eine Mail an die Schule: die Rückfrage bündelt fehlende Infos je Klasse, die Bestätigung listet alle Termine.
            </div>
            <FollowUpPanel
              item={primary}
              missing={allMissing}
              makeDraft={() => buildSplitFollowUp(itemsLive, missingByItem)}
              onSend={() => showToast("Rückfrage an den Kunden wird über n8n versendet.")}
            />
            <ConfirmationPanel item={primary} makeDraft={() => buildSplitConfirmation(itemsLive)} />
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
              const list = fieldsByItem[s.id] || [];
              const personen = list.find((f) => f.key === "number_of_people")?.value || "—";
              const termin = list.find((f) => f.key === "date_range")?.value || "—";
              const grupo =
                list.find((f) => f.key === "grade_level")?.value ||
                list.find((f) => f.key === "program_type")?.value ||
                s.school;
              const fMissing = list.filter((f) => f.status === "missing").length;
              const fReview = list.filter((f) => f.status === "review").length;
              const fVerified = list.filter((f) => f.status === "verified").length;
              const isOpen = expanded === s.id;
              const a = assessments[s.id]?.availability;
              const split = a ? verdictMeta(a.verdict).split || "" : "ok";
              // Freigabe-Logik je Klasse — wie in der Einzelansicht.
              const classMissing = list.filter((f) => f.status === "missing");
              const mResolved = classMissing.length === 0 || !!missingConfirmedBy[s.id];
              const isVerified = !!verified[s.id];
              const canCreateOne = isVerified && mResolved && !isDone;
              return (
                <div
                  key={s.id}
                  className={`split-req ${split} ${isOpen ? "expanded" : ""}`}
                  style={isOpen ? { gridColumn: "1 / -1" } : undefined}
                >
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
                  {/* Vollständigkeit je Klasse — jede hat eigene Anforderungen */}
                  <div className="split-fieldbar">
                    <span className="db-faint" style={{ fontSize: 11 }}>
                      {fVerified}/{list.length} bestätigt
                      {fMissing > 0 && <span style={{ color: "var(--db-error)", fontWeight: 600 }}> · {fMissing} fehlt</span>}
                      {fReview > 0 && <span style={{ color: "#7a4a14", fontWeight: 600 }}> · {fReview} prüfen</span>}
                    </span>
                    <button className="split-toggle" onClick={() => setExpanded(isOpen ? null : s.id)}>
                      <Icon d={I.chevron} size={11} style={{ transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)" }} />
                      {isOpen ? "Weniger" : "Details & bearbeiten"}
                    </button>
                  </div>

                  {/* Detail-/Bearbeitungsansicht: alle erkannten Felder, editierbar */}
                  {isOpen && (
                    <div className="split-fields">
                      {list.map((f) => (
                        <div
                          key={f.id}
                          className={`ex-field ${activeKey === f.key ? "active" : ""}`}
                          style={{ gridTemplateColumns: "18px 130px 1fr auto" }}
                          onMouseEnter={() => setActiveKey(f.key)}
                          onMouseLeave={() => setActiveKey(null)}
                        >
                          <span className={`ex-state ${f.status === "verified" ? "verified" : f.status === "missing" ? "missing" : "review"}`}>
                            <Icon d={f.status === "verified" ? I.check : f.status === "missing" ? I.x : I.clock} size={11} stroke={2.2} />
                          </span>
                          <span className="ex-label">{f.label}</span>
                          <span className={`ex-value ${f.status === "missing" ? "missing" : ""}`}>
                            {editing && editing.itemId === s.id && editing.fieldId === f.id && !isDone ? (
                              <input
                                autoFocus
                                defaultValue={f.value}
                                placeholder="Wert eingeben…"
                                onBlur={(e) => saveField(s.id, f.id, e.target.value.trim())}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveField(s.id, f.id, e.target.value.trim());
                                  if (e.key === "Escape") setEditing(null);
                                }}
                              />
                            ) : (
                              <span
                                onClick={() => !isDone && setEditing({ itemId: s.id, fieldId: f.id })}
                                style={{ cursor: isDone ? "default" : "text" }}
                              >
                                {f.value || "— fehlt —"}
                              </span>
                            )}
                          </span>
                          <span style={{ display: "flex", gap: 4 }}>
                            {!isDone && f.status === "review" && (
                              <button className="ex-verify-btn" onClick={() => verifyField(s.id, f.id)} title="Bestätigen">
                                <Icon d={I.check} size={12} />
                              </button>
                            )}
                            {!isDone && (f.status === "missing" || f.status === "verified") && (
                              <button className="ex-verify-btn" onClick={() => setEditing({ itemId: s.id, fieldId: f.id })} title="Ändern">
                                <Icon d={I.pencil} size={11} />
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Kompakt-Überblick nur eingeklappt — aufgeklappt zeigt die volle Belegung-Karte */}
                  {!isOpen && (
                    <>
                      {a && !a.season.ok && (
                        <div className="season-banner compact">
                          <Icon d={I.alert} size={12} />
                          <span>{a.season.rule} — Termin außerhalb der Saison.</span>
                        </div>
                      )}
                      {a?.capacity && <CapacityMeter capacity={a.capacity} />}
                      {duplicates[s.id] && (
                        <div className="split-alt" style={{ color: "var(--db-warn)" }}>
                          <Icon d={I.link} size={11} /> ähnelt Buchung #{duplicates[s.id].booking.id}
                        </div>
                      )}
                    </>
                  )}

                  {/* Aufgeklappt: volle Prüf-Tiefe wie bei einer Einzelanfrage */}
                  {isOpen && (
                    <>
                      {!isDone && (
                        <MissingSummary
                          missing={classMissing}
                          confirmed={!!missingConfirmedBy[s.id]}
                          onConfirm={(v) => setMissingConfirmedBy((p) => ({ ...p, [s.id]: v }))}
                        />
                      )}

                      {duplicates[s.id] && (
                        <DuplicateBanner
                          dup={duplicates[s.id]}
                          onReview={(d) => router.push(`/buchungen#booking-${d.booking.id}`)}
                        />
                      )}

                      {assessments[s.id]?.availability && (
                        <>
                          <div className="det-section-head"><Icon d={I.house} size={12} /> Belegung &amp; Eignung</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <AvailabilityCard
                              assessment={assessments[s.id]}
                              onSelectAlternative={(alt) =>
                                showToast(`Alternative ${alt.label} wird ${primary.from.split(" ")[0]} vorgeschlagen (Entwurf in n8n).`)
                              }
                            />
                            <SafetyGate
                              assessment={assessments[s.id]}
                              contactName={primary.from.split(" ")[0]}
                              onAsk={() => showToast("Rückfrage zur Geschlechter-Aufteilung wird in n8n erstellt (v2).")}
                              onEstimate={() => showToast("Schätzung übernommen — im Audit als „geschätzt“ markiert.")}
                            />
                          </div>
                        </>
                      )}

                      {!isDone && (
                        <>
                          <div className="det-section-head primary"><Icon d={I.check} size={12} /> Freigabe</div>
                          <VerifyGate
                            checked={isVerified}
                            onToggle={(v) => toggleVerify(s.id, v)}
                            verifierName={verifierName}
                            verifiedAt={verifiedAtBy[s.id]}
                            locked={!mResolved}
                            label={`„${grupo}" geprüft und freigeben.`}
                          />
                          {!mResolved && (
                            <div className="db-muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                              Erst die fehlenden Pflicht-Angaben klären oder „trotzdem fortfahren" bestätigen.
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    {isDone ? (
                      <span className="db-pill db-pill-success" style={{ height: 26 }}>
                        <Icon d={I.check} size={12} /> Angelegt
                      </span>
                    ) : (
                      <>
                        <Pill tone={isVerified ? "success" : classMissing.length ? "warn" : "neutral"} dot={false}>
                          {isVerified ? "freigegeben" : classMissing.length ? `${classMissing.length} fehlt` : "prüfen"}
                        </Pill>
                        <span style={{ marginLeft: "auto" }}>
                          <Btn
                            kind="primary"
                            size="sm"
                            icon="check"
                            disabled={!canCreateOne}
                            style={!canCreateOne ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                            title={!isOpen && !isVerified ? "Details öffnen, prüfen und freigeben" : undefined}
                            onClick={() => canCreateOne && createOne(s.id)}
                          >
                            Buchung anlegen
                          </Btn>
                        </span>
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
