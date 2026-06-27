"use client";
// components/Detail.js — Single inquiry view: source on the left (email/call),
// the data the AI extracted on the right — to review, edit (saved to Postgres)
// and create the booking.
import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill, Btn, Card, ChannelPill, HouseTag } from "@/components/ui";
import DetailHeader from "@/components/DetailHeader";
import ConfirmationPanel from "@/components/ConfirmationPanel";
import FollowUpPanel from "@/components/FollowUpPanel";
import { AvailabilityCard, SafetyGate } from "@/components/Availability";
import { Stepper, VerifyGate, DuplicateBanner, MissingSummary, nowTime } from "@/components/HitlGate";
import EmailSource from "@/components/EmailSource";
import SchoolHistory from "@/components/SchoolHistory";
import NotesPanel from "@/components/NotesPanel";

// Eine Eckdaten-Chip (Wert vorhanden = normal, sonst rot „… fehlt").
function Fact({ icon, value, missingLabel }) {
  return (
    <span className={`fact${value ? "" : " missing"}`}>
      <span className="fact-ico"><Icon d={I[icon]} size={13} /></span>
      {value || missingLabel}
    </span>
  );
}

// Kleiner Vollständigkeits-Ring (verifizierte Felder / Gesamt).
function CompletenessRing({ value, total }) {
  const pct = total ? value / total : 0;
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
      <circle className="ring-track" cx="21" cy="21" r={r} fill="none" strokeWidth="4" />
      <circle
        className="ring-fill"
        cx="21" cy="21" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
      />
      <text x="21" y="21" transform="rotate(90 21 21)" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 700, fill: "var(--db-text)", fontFamily: "var(--db-font-mono)" }}>
        {Math.round(pct * 100)}
      </text>
    </svg>
  );
}

export default function Detail({ item, staff = [], me, assessment, duplicate, history, notes = [], related = [] }) {
  const router = useRouter();
  const [activeKey, setActiveKey] = useState(null);

  // Zusammenführen ist ein Human-in-the-Loop-Schritt: erst öffnet sich ein
  // Bestätigungs-Dialog (mergeCandidate), der beide Anfragen gegenüberstellt;
  // erst nach „Ja, zusammenführen" wird wirklich verknüpft.
  async function confirmMerge() {
    if (!mergeCandidate) return;
    setMerging(true);
    try {
      await fetch(`/api/inquiries/${item.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: mergeCandidate.id }),
      });
      setMergeCandidate(null);
      router.refresh();
    } catch {
      setMerging(false);
      showToast("Zusammenführen fehlgeschlagen.");
    }
  }
  const alreadyBooked = item.trackerStatus === "booking_created";
  // If already booked, the fields are shown as confirmed (not re-checked).
  const [fields, setFields] = useState(() =>
    alreadyBooked
      ? item.fields.map((f) => ({ ...f, status: f.value ? "verified" : "missing" }))
      : item.fields
  );
  const [assignedTo, setAssignedTo] = useState(item.assignedTo);
  const [editing, setEditing] = useState(null);
  const [created, setCreated] = useState(alreadyBooked);
  const [createdBookingId, setCreatedBookingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [mergeCandidate, setMergeCandidate] = useState(null);
  const [merging, setMerging] = useState(false);
  // Human-in-the-loop: Pflicht-Verifizierung + Bestätigung fehlender Infos.
  const [verifyChecked, setVerifyChecked] = useState(alreadyBooked);
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [missingConfirmed, setMissingConfirmed] = useState(false);
  // Welche Kunden-E-Mail gerade gezeigt wird (null = automatisch nach Vollständigkeit).
  const [mailTab, setMailTab] = useState(null);

  // Locked = already booked: the detail becomes read-only.
  const locked = created;

  const review = fields.filter((f) => f.status === "review");
  const verified = fields.filter((f) => f.status === "verified");
  const missing = fields.filter((f) => f.status === "missing");

  // Eckdaten für den Vorgangs-Kopf.
  const fieldVal = (k) => fields.find((f) => f.key === k)?.value || "";
  const facts = {
    house: fieldVal("house") || item.house || "",
    dates: fieldVal("date_range"),
    people: fieldVal("number_of_people"),
    program: fieldVal("program_type"),
  };
  // „Fehlendes zuerst": nach Status sortieren (fehlt → prüfen → bestätigt).
  const STATUS_RANK = { missing: 0, review: 1, verified: 2 };
  const sortedFields = [...fields].sort((a, b) => (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3));
  const firstVerifiedIdx = sortedFields.findIndex((f) => f.status === "verified");
  const hasAttention = sortedFields.some((f) => f.status !== "verified");
  const complete = missing.length === 0;
  // Empfohlene Mail je nach Stand; per Toggle umschaltbar.
  const recommendedMail = locked || complete ? "confirm" : "followup";
  const effectiveMail = mailTab || recommendedMail;

  // Klartextname für die Audit-Zeile.
  const verifierName = staff.find((s) => s.key === me)?.name || me || "—";
  // Pflicht-Infos müssen geklärt sein, bevor man final freigeben darf.
  const missingResolved = missing.length === 0 || missingConfirmed;
  const canCreate = verifyChecked && missingResolved && !created;

  // Aktueller Prozess-Schritt für den Stepper.
  const currentStep = created
    ? 3
    : !assignedTo
    ? 0
    : review.length > 0 || !missingResolved
    ? 1
    : !verifyChecked
    ? 2
    : 3;

  function onVerifyToggle(v) {
    setVerifyChecked(v);
    setVerifiedAt(v ? nowTime() : null);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Contexto compacto de la Anfrage para la IA (campos extraídos + faltantes).
  function emailContext() {
    const get = (k) => item.fields?.find((f) => f.key === k)?.value || "";
    return {
      contact: item.from && item.from !== "Unbekannt" ? item.from : "",
      school: item.school,
      program: get("program_type"),
      house: get("house"),
      dates: get("date_range"),
      people: get("number_of_people"),
      grade: get("grade_level"),
      missing: missing.map((m) => m.label),
    };
  }

  // Pide a la IA un borrador de e-mail. Devuelve {subject, body} o null (con toast).
  async function aiDraftEmail(type) {
    try {
      const res = await fetch(`/api/inquiries/${item.id}/draft-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context: emailContext() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "KI-Entwurf fehlgeschlagen.");
      }
      return await res.json();
    } catch (e) {
      showToast(e.message || "KI-Entwurf fehlgeschlagen.");
      return null;
    }
  }

  // Envía la Rückfrage (datos faltantes) por n8n. Devuelve true/false para que el
  // panel sepa si marcar como enviado o mantener el editor abierto.
  async function sendFollowUp(id, { to, subject, body }) {
    try {
      const res = await fetch(`/api/inquiries/${id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text: body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Senden fehlgeschlagen.");
      }
      return true;
    } catch (e) {
      showToast(e.message || "Rückfrage konnte nicht gesendet werden.");
      return false;
    }
  }

  function verify(id) {
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, status: "verified" } : f)));
  }
  function verifyAll() {
    setFields((fs) => fs.map((f) => (f.status === "review" ? { ...f, status: "verified" } : f)));
  }

  // Save an edited field to the database (column = field.key).
  async function save(id, val) {
    const field = fields.find((f) => f.id === id);
    setFields((fs) =>
      fs.map((f) => (f.id === id ? { ...f, value: val, status: val ? "verified" : "missing" } : f))
    );
    setEditing(null);
    if (field?.key) {
      try {
        await fetch(`/api/inquiries/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field.key]: val }),
        });
      } catch {
        showToast("Konnte das Feld nicht speichern.");
      }
    }
  }

  async function onAssign(id, who) {
    setAssignedTo(who);
    await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: who }),
    });
  }

  async function createBooking() {
    try {
      const res = await fetch(`/api/inquiries/${item.id}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_by: me }),
      });
      if (!res.ok) throw new Error("create failed");
      const data = await res.json().catch(() => ({}));
      setCreatedBookingId(data.bookingId || null);
      setCreated(true); // erst nach Erfolg → kein falscher "angelegt"-Status bei Fehler
      showToast("Buchung angelegt — Status: Anfrage. Sie können Details später ergänzen.");
    } catch {
      showToast("Konnte die Buchung nicht speichern.");
    }
  }

  return (
    <div className="detail-view" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      {/* sub-header */}
      <DetailHeader
        title={item.school}
        assignId={item.id}
        assignedTo={assignedTo}
        responsibleArea={item.responsibleArea}
        onAssign={onAssign}
        staff={staff}
        me={me}
        extra={created && <Pill tone="success">Buchung angelegt</Pill>}
        badges={
          <>
            <ChannelPill channel={item.channel} />
            <span className="db-faint" style={{ fontSize: 11 }}>
              empfangen {item.receivedAbs}
            </span>
          </>
        }
      />

      {/* Prozess-Schritte */}
      <div style={{ padding: "var(--s-1) var(--bar-pad-x)", borderBottom: "1px solid var(--db-line)", background: "var(--db-paper-2)" }}>
        <Stepper current={currentStep} />
      </div>

      {/* Eckdaten-Kopf — Vorgang auf einen Blick (Haus · Zeitraum · Personen · Programm) */}
      <div className="detail-facts">
        {facts.house ? (
          <HouseTag area={facts.house} label={facts.house} />
        ) : (
          <span className="fact missing"><span className="fact-ico"><Icon d={I.house} size={13} /></span> Haus fehlt</span>
        )}
        <Fact icon="calendar" value={facts.dates} missingLabel="Zeitraum fehlt" />
        <Fact icon="users" value={facts.people ? `${facts.people} Pers.` : ""} missingLabel="Personen fehlt" />
        <Fact icon="flag" value={facts.program} missingLabel="Programm fehlt" />
      </div>

      {/* split */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* SOURCE */}
        <section className="db-scroll" style={{ flex: "1 1 52%", minWidth: 0, padding: "var(--pane-pad)", borderRight: "1px solid var(--db-line)" }}>
          <Card title={item.channel === "phone" ? "Telefonat" : "E-Mail"} kicker={item.receivedAbs}>
            <EmailSource
              item={item}
              fields={fields}
              staff={staff}
              activeKey={activeKey}
              onMarkHover={setActiveKey}
            />
          </Card>
          <div style={{ marginTop: 12 }}>
            <NotesPanel inquiryId={item.id} schoolName={item.school} me={me} initialNotes={notes} />
          </div>
        </section>

        {/* EXTRACTED */}
        <section style={{ flex: "1 1 48%", minWidth: 0, display: "flex", flexDirection: "column", background: "var(--db-paper)" }}>
          <div style={{ padding: "var(--bar-pad-y) var(--bar-pad-x) var(--s-1)", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 8 }}>
            <div className="ring-wrap">
              <CompletenessRing value={verified.length} total={fields.length} />
              <div>
                <div className="db-card-title">Automatisch erkannte Daten</div>
                <div className="db-muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {verified.length}/{fields.length} bestätigt{missing.length ? ` · ${missing.length} fehlen` : ""}
                </div>
              </div>
            </div>
            {!locked && review.length > 0 && (
              <button className="ex-verify-btn" style={{ marginLeft: "auto" }} onClick={verifyAll}>
                <Icon d={I.check} size={12} /> Alle bestätigen
              </button>
            )}
          </div>

          <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: "var(--s-2) var(--bar-pad-x) var(--bar-pad-x)" }}>
            {/* Abschnitt 1: Daten prüfen */}
            <div className="det-section-head"><Icon d={I.doc} size={12} /> Daten prüfen</div>
            {sortedFields.map((f, idx) => (
              <Fragment key={f.id}>
              {hasAttention && firstVerifiedIdx > 0 && idx === firstVerifiedIdx && (
                <div className="ex-divider" title="bestätigt" />
              )}
              <div
                className={`ex-field ${activeKey === f.key ? "active" : ""}`}
                style={{ gridTemplateColumns: "18px 130px 1fr auto" }}
                onMouseEnter={() => setActiveKey(f.key)}
                onMouseLeave={() => setActiveKey(null)}
              >
                <span
                  className={`ex-state ${
                    f.status === "verified" ? "verified" : f.status === "missing" ? "missing" : "review"
                  }`}
                >
                  <Icon
                    d={f.status === "verified" ? I.check : f.status === "missing" ? I.x : I.clock}
                    size={11}
                    stroke={2.2}
                  />
                </span>
                <span className="ex-label">{f.label}</span>
                <span className={`ex-value ${f.status === "missing" ? "missing" : ""}`}>
                  {editing === f.id && !locked ? (
                    <input
                      autoFocus
                      defaultValue={f.value}
                      placeholder="Wert eingeben…"
                      onBlur={(e) => save(f.id, e.target.value.trim())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") save(f.id, e.target.value.trim());
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => !locked && setEditing(f.id)}
                      style={{ cursor: locked ? "default" : "text" }}
                    >
                      {f.value || "— fehlt —"}
                    </span>
                  )}
                </span>
                <span style={{ display: "flex", gap: 4 }}>
                  {!locked && f.status === "review" && (
                    <button className="ex-verify-btn" onClick={() => verify(f.id)} title="Bestätigen">
                      <Icon d={I.check} size={12} />
                    </button>
                  )}
                  {!locked && (f.status === "missing" || f.status === "verified") && (
                    <button className="ex-verify-btn" onClick={() => setEditing(f.id)} title="Ändern">
                      <Icon d={I.pencil} size={11} />
                    </button>
                  )}
                </span>
              </div>
              </Fragment>
            ))}

            {!locked && (
              <div style={{ marginTop: 12 }}>
                <MissingSummary
                  missing={missing}
                  confirmed={missingConfirmed}
                  onConfirm={setMissingConfirmed}
                />
              </div>
            )}

            {/* Kontext zur Anfrage — bewusst unter den Daten, damit die Felder zuerst kommen */}
            {history && (
              <div style={{ marginTop: 14 }}>
                <SchoolHistory history={history} schoolName={item.school} />
              </div>
            )}
            {duplicate && (
              <div style={{ marginTop: 10 }}>
                <DuplicateBanner
                  dup={duplicate}
                  onReview={(d) => router.push(`/buchungen#booking-${d.booking.id}`)}
                />
              </div>
            )}
            {related.length > 0 && (
              <div className="related-banner" style={{ marginTop: 10 }}>
                <div className="rel-head">
                  <Icon d={I.link} size={14} />
                  <b style={{ fontSize: 13 }}>Verwandte Anfragen derselben Schule</b>
                </div>
                {related.map((r) => (
                  <div key={r.id} className="rel-row">
                    <ChannelPill channel={r.channel} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.summary} <span className="db-faint">· {r.received}</span>
                      {r.crossChannel && <span className="note-tag other">anderer Kanal</span>}
                    </span>
                    <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => router.push(`/inquiry/${r.id}`)}>öffnen</button>
                    <button className="db-btn db-btn-sage db-btn-sm" onClick={() => setMergeCandidate(r)}>
                      <Icon d={I.link} size={11} /> zusammenführen
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Abschnitt 2: Belegung & Eignung */}
            {assessment && <div className="det-section-head" style={{ marginTop: 18 }}><Icon d={I.house} size={12} /> Belegung &amp; Eignung</div>}
            {assessment && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
                <AvailabilityCard
                  assessment={assessment}
                  onSelectAlternative={(alt) =>
                    showToast(`Alternative ${alt.label} wird ${item.from.split(" ")[0]} vorgeschlagen (Entwurf in n8n).`)
                  }
                />
                <SafetyGate
                  assessment={assessment}
                  contactName={item.from.split(" ")[0]}
                  onAsk={() => showToast("Rückfrage zur Geschlechter-Aufteilung wird in n8n erstellt (v2).")}
                  onEstimate={() => showToast("Schätzung übernommen — im Audit als „geschätzt“ markiert.")}
                />
              </div>
            )}

            {/* Abschnitt 3: E-Mails an den Kunden (human-in-the-loop) */}
            <div className="det-section-head" style={{ marginTop: 18 }}><Icon d={I.mail} size={12} /> E-Mail an den Kunden</div>
            {/* Toggle: standardmäßig die empfohlene Mail, aber beide erreichbar.
                Nach der Buchung (locked) nur noch die Bestätigung. */}
            {!locked && (
              <div className="mail-toggle" role="tablist">
                <button
                  role="tab"
                  aria-selected={effectiveMail === "followup"}
                  className={effectiveMail === "followup" ? "active" : ""}
                  onClick={() => setMailTab("followup")}
                >
                  <Icon d={I.mail} size={11} /> Rückfrage
                  {recommendedMail === "followup" && <span className="mt-dot" title="empfohlen" />}
                </button>
                <button
                  role="tab"
                  aria-selected={effectiveMail === "confirm"}
                  className={effectiveMail === "confirm" ? "active" : ""}
                  onClick={() => setMailTab("confirm")}
                >
                  <Icon d={I.check} size={11} /> Bestätigung
                  {recommendedMail === "confirm" && <span className="mt-dot" title="empfohlen" />}
                </button>
              </div>
            )}
            <div className="db-faint" style={{ fontSize: 12, margin: "6px 0 8px" }}>
              {effectiveMail === "confirm"
                ? complete
                  ? "Alle Pflichtangaben vollständig — Buchungsbestätigung kann raus."
                  : "Hinweis: Es fehlen noch Pflichtangaben — Bestätigung erst nach Klärung sinnvoll."
                : `Noch ${missing.length || 0} Info${missing.length !== 1 ? "s" : ""} offen — Rückfrage an den Kunden.`}
            </div>
            {effectiveMail === "confirm" ? (
              <ConfirmationPanel item={item} onAiDraft={() => aiDraftEmail("confirmation")} />
            ) : (
              <FollowUpPanel
                item={item}
                missing={missing}
                onSend={(d) => sendFollowUp(item.id, d)}
                onAiDraft={() => aiDraftEmail("followup")}
              />
            )}

            {/* Abschnitt 4: Freigabe (primärer Schritt vor dem Anlegen) */}
            <div className="det-section-head primary" style={{ marginTop: 18 }}><Icon d={I.check} size={12} /> Freigabe</div>
            <div>
              <VerifyGate
                checked={verifyChecked}
                onToggle={onVerifyToggle}
                verifierName={verifierName}
                verifiedAt={verifiedAt}
                locked={locked || !missingResolved}
              />
              {!missingResolved && (
                <div className="db-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Erst die fehlenden Pflicht-Angaben oben klären oder „trotzdem fortfahren" bestätigen.
                </div>
              )}
            </div>
          </div>

          {/* action bar */}
          <div className="db-approve-bar">
            {created ? (
              <Pill tone="success">Buchung angelegt · Status Anfrage</Pill>
            ) : verifyChecked ? (
              <Pill tone="success">Freigegeben von {verifierName.split(" ")[0]}</Pill>
            ) : (
              <Pill tone="warn">
                {review.length ? `${review.length} ungeprüft` : "Freigabe ausstehend"}
                {missing.length ? ` · ${missing.length} fehlt` : ""}
              </Pill>
            )}
            <span className="db-muted" style={{ fontSize: 12 }}>
              {created
                ? "Erscheint im Hausmanager."
                : canCreate
                ? "Freigegeben — jetzt anlegen."
                : "Felder prüfen und unten freigeben."}
            </span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {created ? (
                <>
                  <Btn kind="secondary" onClick={() => router.push("/posteingang")}>
                    Zum Posteingang
                  </Btn>
                  <Btn
                    kind="primary"
                    iconR="arrowRight"
                    onClick={() => router.push(createdBookingId ? `/buchungen#booking-${createdBookingId}` : "/buchungen")}
                  >
                    Zur Buchung
                  </Btn>
                </>
              ) : (
                <Btn
                  kind="primary"
                  iconR="arrowRight"
                  disabled={!canCreate}
                  style={!canCreate ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                  onClick={() => canCreate && createBooking()}
                >
                  Buchung anlegen
                </Btn>
              )}
            </span>
          </div>
        </section>
      </div>

      {mergeCandidate && (
        <div className="modal-backdrop" onClick={() => !merging && setMergeCandidate(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <Icon d={I.link} size={15} />
              <b>Anfragen zusammenführen — bitte prüfen</b>
              <button className="modal-x" onClick={() => setMergeCandidate(null)} disabled={merging}>
                <Icon d={I.x} size={14} />
              </button>
            </div>

            <div style={{ padding: 16, overflowY: "auto" }}>
              <p className="db-muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 14 }}>
                Gehören diese beiden Anfragen wirklich zum selben Vorgang? Bitte vergleichen und
                bestätigen. Nach dem Zusammenführen erscheinen sie als <b>ein</b> gemeinsamer Fall.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  {
                    label: "Dieser Vorgang",
                    channel: item.channel,
                    school: item.school,
                    contact: item.from,
                    summary: item.summary,
                    received: item.receivedAbs || item.received,
                  },
                  {
                    label: "Verknüpfen mit",
                    channel: mergeCandidate.channel,
                    school: mergeCandidate.school,
                    contact: null,
                    summary: mergeCandidate.summary,
                    received: mergeCandidate.received,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid var(--db-line)",
                      borderRadius: 8,
                      padding: 12,
                      background: "var(--db-paper-2)",
                    }}
                  >
                    <div
                      className="db-faint"
                      style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}
                    >
                      {s.label}
                    </div>
                    <ChannelPill channel={s.channel} />
                    <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8 }}>{s.school || "—"}</div>
                    {s.contact && <div style={{ fontSize: 12 }}>{s.contact}</div>}
                    <div style={{ fontSize: 12, color: "var(--db-text-muted)", marginTop: 6 }}>{s.summary}</div>
                    {s.received && (
                      <div className="db-faint" style={{ fontSize: 11, marginTop: 6 }}>{s.received}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="db-muted" style={{ marginTop: 12, fontSize: 12 }}>
                Namens-Übereinstimmung: <b>{mergeCandidate.score}%</b>
                {mergeCandidate.crossChannel && <span className="note-tag other">anderer Kanal</span>}
              </div>
            </div>

            <div className="modal-foot">
              <span style={{ flex: 1 }} />
              <Btn kind="secondary" size="sm" onClick={() => setMergeCandidate(null)} disabled={merging}>
                Abbrechen
              </Btn>
              <Btn kind="sage" size="sm" icon="link" onClick={confirmMerge} disabled={merging}>
                {merging ? "Wird verknüpft…" : "Ja, zusammenführen"}
              </Btn>
            </div>
          </div>
        </div>
      )}

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
            padding: "12px 16px",
            borderRadius: 10,
            boxShadow: "0 8px 24px -6px rgba(40,20,25,.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            maxWidth: 460,
          }}
        >
          <Icon d={I.check} size={16} stroke={2.2} /> {toast}
        </div>
      )}
    </div>
  );
}
