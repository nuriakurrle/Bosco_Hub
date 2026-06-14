"use client";
// components/Detail.js — Single inquiry view: source on the left (email/call),
// the data the AI extracted on the right — to review, edit (saved to Postgres)
// and create the booking.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill, Btn, Card } from "@/components/ui";
import AssignControl from "@/components/AssignControl";
import ConfirmationPanel from "@/components/ConfirmationPanel";
import FollowUpPanel from "@/components/FollowUpPanel";
import { AvailabilityCard, SafetyGate } from "@/components/Availability";
import { Stepper, VerifyGate, DuplicateBanner, MissingSummary, nowTime } from "@/components/HitlGate";
import EmailSource from "@/components/EmailSource";
import SchoolHistory from "@/components/SchoolHistory";
import NotesPanel from "@/components/NotesPanel";
import { suggestedPerson } from "@/lib/team";

export default function Detail({ item, staff = [], me, assessment, duplicate, history, notes = [], related = [] }) {
  const router = useRouter();
  const [activeKey, setActiveKey] = useState(null);

  async function mergeWith(targetId) {
    try {
      await fetch(`/api/inquiries/${item.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      router.refresh();
    } catch {
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
  const [toast, setToast] = useState(null);
  // Human-in-the-loop: Pflicht-Verifizierung + Bestätigung fehlender Infos.
  const [verifyChecked, setVerifyChecked] = useState(alreadyBooked);
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [missingConfirmed, setMissingConfirmed] = useState(false);

  // Locked = already booked: the detail becomes read-only.
  const locked = created;

  const review = fields.filter((f) => f.status === "review");
  const verified = fields.filter((f) => f.status === "verified");
  const missing = fields.filter((f) => f.status === "missing");

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
    setCreated(true);
    try {
      await fetch(`/api/inquiries/${item.id}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_by: me }),
      });
      showToast("Buchung angelegt — Status: Anfrage. Sie können Details später ergänzen.");
      setTimeout(() => router.push("/posteingang"), 1200);
    } catch {
      showToast("Konnte die Buchung nicht speichern.");
    }
  }

  return (
    <div className="detail-view" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      {/* sub-header */}
      <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 14 }}>
        <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => router.push("/posteingang")}>
          <Icon d={I.chevron} size={13} style={{ transform: "rotate(180deg)" }} /> Posteingang
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`db-pill ${item.channel === "phone" ? "db-pill-burgundy" : "db-pill-info"}`}>
              <Icon d={item.channel === "phone" ? I.clock : I.mail} size={11} />
              {item.channel === "phone" ? "Telefon" : "E-Mail"}
            </span>
            <span className="db-faint" style={{ fontSize: 11 }}>
              empfangen {item.receivedAbs}
            </span>
          </div>
          <h1 className="serif" style={{ margin: "3px 0 0", fontSize: 21, fontWeight: 500, color: "var(--db-primary-ink)" }}>
            {item.school}
          </h1>
        </div>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--db-text-muted)" }}>
            Zuständig:
            <AssignControl
              id={item.id}
              who={assignedTo}
              suggest={suggestedPerson(item.responsibleArea, staff)}
              onAssign={onAssign}
              compact
              staff={staff}
              me={me}
            />
          </span>
          {created && <Pill tone="success">Buchung angelegt</Pill>}
        </span>
      </div>

      {/* Prozess-Schritte */}
      <div style={{ padding: "8px 22px", borderBottom: "1px solid var(--db-line)", background: "var(--db-paper-2)" }}>
        <Stepper current={currentStep} />
      </div>

      {/* split */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* SOURCE */}
        <section className="db-scroll" style={{ flex: "1 1 52%", minWidth: 0, padding: 22, borderRight: "1px solid var(--db-line)" }}>
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
          <div style={{ padding: "16px 18px 10px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              <div className="db-card-title">Automatisch erkannte Daten</div>
              <div className="db-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                {verified.length}/{fields.length} bestätigt · {missing.length} fehlen
              </div>
            </div>
            {!locked && review.length > 0 && (
              <button className="ex-verify-btn" style={{ marginLeft: "auto" }} onClick={verifyAll}>
                <Icon d={I.check} size={12} /> Alle bestätigen
              </button>
            )}
          </div>

          <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: "14px 18px 18px" }}>
            {history && (
              <div style={{ marginBottom: 10 }}>
                <SchoolHistory history={history} />
              </div>
            )}
            {duplicate && (
              <div style={{ marginBottom: 10 }}>
                <DuplicateBanner
                  dup={duplicate}
                  onReview={(d) => router.push(`/buchungen#booking-${d.booking.id}`)}
                />
              </div>
            )}
            {related.length > 0 && (
              <div className="related-banner">
                <div className="rel-head">
                  <Icon d={I.link} size={14} />
                  <b style={{ fontSize: 12.5 }}>Verwandte Anfragen derselben Schule</b>
                </div>
                {related.map((r) => (
                  <div key={r.id} className="rel-row">
                    <span className={`db-pill ${r.channel === "phone" ? "db-pill-burgundy" : "db-pill-info"}`}>
                      <Icon d={r.channel === "phone" ? I.clock : I.mail} size={10} />
                      {r.channel === "phone" ? "Telefon" : "E-Mail"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.summary} <span className="db-faint">· {r.received}</span>
                      {r.crossChannel && <span className="note-tag other">anderer Kanal</span>}
                    </span>
                    <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => router.push(`/inquiry/${r.id}`)}>öffnen</button>
                    <button className="db-btn db-btn-sage db-btn-sm" onClick={() => mergeWith(r.id)}>
                      <Icon d={I.link} size={11} /> zusammenführen
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fields.map((f) => (
              <div
                key={f.id}
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

            {/* Belegungs-/Saison-Check + Zimmer-/Datenschutz-Gate (v2) */}
            {assessment && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
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

            {/* E-Mail-Entwürfe an den Kunden (human-in-the-loop):
                Rückfrage bei fehlenden Infos + Kundenbestätigung. */}
            {!locked && (
              <div style={{ marginTop: 16 }}>
                <FollowUpPanel
                  item={item}
                  missing={missing}
                  onSend={() => showToast("Rückfrage an den Kunden wird über n8n versendet.")}
                />
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <ConfirmationPanel item={item} />
            </div>

            {/* Pflicht-Verifizierung vor dem Anlegen */}
            <div style={{ marginTop: 16 }}>
              <VerifyGate
                checked={verifyChecked}
                onToggle={onVerifyToggle}
                verifierName={verifierName}
                verifiedAt={verifiedAt}
                locked={locked || !missingResolved}
              />
              {!missingResolved && (
                <div className="db-muted" style={{ fontSize: 11.5, marginTop: 6 }}>
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
            <span className="db-muted" style={{ fontSize: 11.5 }}>
              {created
                ? "Erscheint im Hausmanager."
                : canCreate
                ? "Freigegeben — jetzt anlegen."
                : "Felder prüfen und unten freigeben."}
            </span>
            <span style={{ marginLeft: "auto" }}>
              <Btn
                kind="primary"
                iconR="arrowRight"
                disabled={!canCreate}
                style={!canCreate ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                onClick={() => canCreate && createBooking()}
              >
                {created ? "Angelegt" : "Buchung anlegen"}
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
            maxWidth: 460,
          }}
        >
          <Icon d={I.check} size={16} stroke={2.2} /> {toast}
        </div>
      )}
    </div>
  );
}
