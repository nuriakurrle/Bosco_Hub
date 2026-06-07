"use client";
// components/Detail.js — Vista de una sola anfrage: a la izquierda la fuente
// (email/llamada), a la derecha los datos que extrajo la IA, para revisar,
// editar (se guarda en Postgres) y crear la reserva.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill, Btn, Card } from "@/components/ui";
import AssignControl from "@/components/AssignControl";
import ConfirmationPanel from "@/components/ConfirmationPanel";
import { suggestedPerson } from "@/lib/team";

export default function Detail({ item, staff = [], me }) {
  const router = useRouter();
  const alreadyBooked = item.trackerStatus === "booking_created";
  // Si ya hay reserva, los campos se muestran como confirmados (no se re-chequean).
  const [fields, setFields] = useState(() =>
    alreadyBooked
      ? item.fields.map((f) => ({ ...f, status: f.value ? "verified" : "missing" }))
      : item.fields
  );
  const [assignedTo, setAssignedTo] = useState(item.assignedTo);
  const [editing, setEditing] = useState(null);
  const [created, setCreated] = useState(alreadyBooked);
  const [toast, setToast] = useState(null);

  // Bloqueado = ya tiene reserva: el detalle queda de solo lectura.
  const locked = created;

  const review = fields.filter((f) => f.status === "review");
  const verified = fields.filter((f) => f.status === "verified");
  const missing = fields.filter((f) => f.status === "missing");
  const allConfirmed = review.length === 0 && verified.length > 0;

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

  // Guardar un campo editado en la base de datos (columna = field.key).
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
      setTimeout(() => router.push("/"), 1200);
    } catch {
      showToast("Konnte die Buchung nicht speichern.");
    }
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
            <span className={`db-pill ${item.channel === "phone" ? "db-pill-burgundy" : "db-pill-info"}`}>
              <Icon d={item.channel === "phone" ? I.clock : I.mail} size={11} />
              {item.channel === "phone" ? "Telefon" : "E-Mail"}
            </span>
            <span className="db-faint" style={{ fontSize: 11 }}>
              empfangen {item.receivedAbs}
            </span>
            {item.containsSensitiveData && (
              <span title={item.sensitiveDataNote}>
                <Pill tone="error" dot={false}>
                  <Icon d={I.shield} size={11} /> Sensible Daten
                </Pill>
              </span>
            )}
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

      {/* split */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* FUENTE */}
        <section className="db-scroll" style={{ flex: "1 1 52%", minWidth: 0, padding: 22, borderRight: "1px solid var(--db-line)" }}>
          <Card title={item.channel === "phone" ? "Telefonat" : "E-Mail"} kicker={item.receivedAbs}>
            <p style={{ fontFamily: "var(--db-font-mono)", fontSize: 11, color: "var(--db-text-faint)", marginTop: 0 }}>
              Von: {item.from}
              {item.customerEmail ? ` · ${item.customerEmail}` : ""}
            </p>
            {item.subject && (
              <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 8px" }}>{item.subject}</p>
            )}
            <div className="db-email">
              {item.rawBody ? (
                item.rawBody.split("\n").map((line, i) => <p key={i}>{line || " "}</p>)
              ) : (
                <p className="db-muted" style={{ fontStyle: "italic" }}>
                  {item.channel === "phone"
                    ? "Kein Transkript gespeichert. (Anruf-Transkription folgt in v2.)"
                    : "Kein E-Mail-Text gespeichert. Aktiviere das Speichern von raw_body im n8n-Workflow."}
                </p>
              )}
            </div>
          </Card>
        </section>

        {/* EXTRAÍDO */}
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

          <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: "8px 14px 14px" }}>
            {fields.map((f) => (
              <div key={f.id} className="ex-field" style={{ gridTemplateColumns: "18px 130px 1fr auto" }}>
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

            {missing.length > 0 && (
              <div className="followup" style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon d={I.alert} size={14} style={{ color: "var(--db-warn)" }} />
                  <b style={{ fontSize: 12.5, color: "#7a4a14" }}>
                    {missing.length} Angabe{missing.length > 1 ? "n" : ""} fehlt
                  </b>
                </div>
                <div className="db-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  Fehlt: {missing.map((m) => m.label).join(", ")}. Sie können trotzdem schon eine
                  Buchung mit Status „Anfrage" anlegen und später ergänzen.
                </div>
                <Btn
                  kind="sage"
                  size="sm"
                  icon="send"
                  onClick={() => showToast("Rückfrage-Entwurf wird in n8n erstellt (v2).")}
                >
                  Rückfrage an {item.from.split(" ")[0]} senden
                </Btn>
              </div>
            )}

            {/* Confirmación al cliente (human-in-the-loop) */}
            <ConfirmationPanel item={item} />
          </div>

          {/* barra de acción */}
          <div className="db-approve-bar">
            {created ? (
              <Pill tone="success">Buchung angelegt · Status Anfrage</Pill>
            ) : allConfirmed ? (
              <Pill tone="success">Alle Daten bestätigt</Pill>
            ) : (
              <Pill tone="warn">
                {review.length} ungeprüft{missing.length ? ` · ${missing.length} fehlt` : ""}
              </Pill>
            )}
            <span className="db-muted" style={{ fontSize: 11.5 }}>
              {created ? "Erscheint im Hausmanager." : "Prüfen Sie die Felder, dann anlegen."}
            </span>
            <span style={{ marginLeft: "auto" }}>
              <Btn
                kind="primary"
                iconR="arrowRight"
                disabled={created}
                style={created ? { opacity: 0.5, cursor: "default" } : undefined}
                onClick={() => !created && createBooking()}
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
