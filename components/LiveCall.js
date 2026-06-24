"use client";
// components/LiveCall.js — Consola de llamada en vivo (Fase 1, demo).
// Escucha el SSE /api/live-call/stream (transcripción + entidades simuladas),
// pinta el transcript con resaltado a la izquierda y la tarjeta de datos a la
// derecha, y al confirmar crea la Anfrage (channel='phone').
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import { Pill, Btn } from "@/components/ui";

// Orden y etiquetas de la tarjeta de datos (mismas que el flujo de e-mail).
// `col` es la columna de la base de datos; `mark` enlaza el campo con su color
// de resaltado en el transcript (para el efecto hover bidireccional).
const FIELDS = [
  { key: "schule", label: "Gruppe / Schule", col: "school_name", mark: "school" },
  { key: "kontakt", label: "Kontakt", col: "contact_person", mark: "contact" },
  { key: "art", label: "Art / Programm", col: "program_type", mark: "program" },
  { key: "haus", label: "Haus", col: "house", mark: null },
  { key: "termin", label: "Zeitraum", col: "date_range", mark: "date" },
  { key: "personen", label: "Personen", col: "number_of_people", mark: "people" },
  { key: "stufe", label: "Jahrgangsstufe", col: "grade_level", mark: "grade" },
  { key: "sonder", label: "Besonderes", col: "special_requirements", mark: "sensitive" },
];

const SPK_LABEL = { staff: "Mitarbeiter", caller: "Anrufer" };

// URL del microservicio de transcripción en vivo (Fase 3b).
// En local: ws://localhost:8787. En producción: wss://live.<dominio> (vía Caddy).
function liveWsUrl() {
  if (typeof window === "undefined") return "ws://localhost:8787";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "ws://localhost:8787";
  return `wss://live.${window.location.host}`;
}

// Parte un texto en tokens, resaltando las citas (quotes) de las entidades.
function tokenize(text, marks) {
  let tokens = [{ text }];
  for (const m of marks) {
    if (!m.quote) continue;
    const next = [];
    for (const tk of tokens) {
      const idx = tk.mark ? -1 : tk.text.indexOf(m.quote);
      if (idx < 0) { next.push(tk); continue; }
      const before = tk.text.slice(0, idx);
      const after = tk.text.slice(idx + m.quote.length);
      if (before) next.push({ text: before });
      next.push({ text: m.quote, mark: { type: m.type, low: m.low } });
      if (after) next.push({ text: after });
    }
    tokens = next;
  }
  return tokens;
}

export default function LiveCall() {
  const router = useRouter();
  const esRef = useRef(null);
  const wsRef = useRef(null);
  const watchRef = useRef(null); // WS /watch permanente (escucha llamadas Twilio)
  const audioRef = useRef(null); // { ac, stream, node }
  const scrollRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | listening | ended
  const [segments, setSegments] = useState([]);
  const [partialText, setPartialText] = useState("");
  const [fields, setFields] = useState({});
  const [sensitiveNote, setSensitiveNote] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [showSensitive, setShowSensitive] = useState(false);
  const [hot, setHot] = useState(null); // tipo de entidad resaltada al pasar el ratón
  const [pinned, setPinned] = useState(null); // tipo fijado al hacer clic en una marca
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Cierra todo al desmontar.
  useEffect(() => () => closeAll(), []);

  // Escucha llamadas de Twilio en segundo plano: si entra una, la consola se
  // muestra sola (sin pulsar nada). Independiente de los botones de prueba.
  useEffect(() => {
    let stop = false, retry;
    function connect() {
      if (stop) return;
      const ws = new WebSocket(`${liveWsUrl()}/watch`);
      watchRef.current = ws;
      ws.onmessage = (e) => handleEvent(JSON.parse(e.data));
      ws.onclose = () => { if (!stop) retry = setTimeout(connect, 4000); };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => { stop = true; clearTimeout(retry); watchRef.current?.close(); };
  }, []);

  // Auto-scroll del transcript al último segmento.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [segments]);

  // Limpia transcript/campos antes de empezar una nueva fuente.
  function resetState() {
    setSegments([]); setPartialText(""); setFields({}); setSensitiveNote(null);
    setSuggestion(null); setShowSensitive(false); setPinned(null);
  }

  // Cierra todas las conexiones/recursos abiertos (SSE, WebSocket, micrófono).
  function closeAll() {
    esRef.current?.close(); esRef.current = null;
    wsRef.current?.close(); wsRef.current = null;
    if (audioRef.current) {
      const { ac, stream } = audioRef.current;
      stream?.getTracks().forEach((t) => t.stop());
      ac?.close();
      audioRef.current = null;
    }
  }

  // Aplica un evento al estado (mismo formato en SSE y en WebSocket).
  function handleEvent(msg) {
    if (msg.type === "call") { if (msg.active) setStatus("listening"); return; }
    if (msg.type === "reset") resetState();
    else if (msg.type === "status") setStatus(msg.value);
    else if (msg.type === "partial") setPartialText(msg.text);
    else if (msg.type === "segment") { setSegments((s) => [...s, msg.seg]); setPartialText(""); }
    else if (msg.type === "fields")
      setFields((prev) => {
        // Merge acumulativo: no borrar un campo ya detectado; actualizar solo si
        // estaba vacío o el nuevo valor tiene confianza igual o mayor.
        const next = { ...prev };
        for (const [k, v] of Object.entries(msg.fields)) {
          const old = next[k];
          if (!old?.value || (v.conf ?? 0) >= (old.conf ?? 0)) next[k] = v;
        }
        return next;
      });
    else if (msg.type === "sensitive") setSensitiveNote(msg.note);
    else if (msg.type === "suggestion") setSuggestion(msg.text);
    else if (msg.type === "error") { setToast(msg.message); setStatus("ended"); }
  }

  // Demo / archivo: fuente por SSE.
  function startStream(url) {
    closeAll(); resetState();
    const es = new EventSource(url);
    esRef.current = es;
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      handleEvent(msg);
      if (msg.type === "done") es.close();
    };
    es.onerror = () => { es.close(); setStatus("ended"); };
  }
  const answer = (scenario = "complete") =>
    startStream(`/api/live-call/stream?scenario=${scenario}`);
  const answerReal = () => startStream("/api/live-call/transcribe");

  // En vivo: micrófono del navegador → microservicio live-call (WebSocket).
  async function answerLive() {
    closeAll(); resetState();
    setStatus("listening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = new AudioContext({ sampleRate: 24000 });
      await ac.audioWorklet.addModule("/pcm-worklet.js");
      const src = ac.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ac, "pcm-worklet");
      audioRef.current = { ac, stream, node };

      const ws = new WebSocket(liveWsUrl());
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
      ws.onmessage = (e) => handleEvent(JSON.parse(e.data));
      ws.onerror = () => {
        setToast("Keine Verbindung zum live-call Dienst (läuft `npm start` in live-call/?).");
        setStatus("ended");
      };
      ws.onclose = () => setStatus((s) => (s === "listening" ? "ended" : s));

      // Reenvía el PCM del worklet al microservicio.
      node.port.onmessage = (e) => { if (ws.readyState === WebSocket.OPEN) ws.send(e.data); };
      src.connect(node);
      node.connect(ac.destination); // mantiene el grafo activo (el worklet no emite audio)
    } catch (err) {
      setToast("Mikrofon nicht verfügbar: " + (err?.message || err));
      setStatus("ended");
    }
  }

  // Modo Twilio: escucha la transcripción de una llamada REAL (sin micrófono).
  // Se suscribe a /watch; el microservicio difunde ahí lo que llega por /twilio.
  function watchTwilio() {
    closeAll(); resetState();
    setStatus("listening");
    const ws = new WebSocket(`${liveWsUrl()}/watch`);
    wsRef.current = ws;
    ws.onmessage = (e) => handleEvent(JSON.parse(e.data));
    ws.onerror = () => { setToast("Keine Verbindung zum live-call Dienst."); setStatus("ended"); };
  }

  function hangup() {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Detener el micro (silencio) y pedir cerrar la última frase + extracción.
      if (audioRef.current) {
        audioRef.current.stream?.getTracks().forEach((t) => t.stop());
        audioRef.current.ac?.close();
        audioRef.current = null;
      }
      ws.send(JSON.stringify({ type: "stop" }));
      setTimeout(() => closeAll(), 2500); // dar tiempo a la transcripción/extracción final
    } else {
      closeAll();
    }
    setStatus("ended");
  }

  async function createAnfrage() {
    setSaving(true);
    // Reconstruye el transcript como texto para guardarlo en raw_body.
    const raw = segments
      .map((s) => `${SPK_LABEL[s.spk]}: ${s.tokens.map((t) => t.text).join("")}`)
      .join("\n");
    const payload = { channel: "phone", raw_body: raw };
    for (const f of FIELDS) {
      const v = fields[f.key]?.value;
      if (v) payload[f.col] = v;
    }
    payload.contains_sensitive_data = !!sensitiveNote || !!fields.sonder?.sensitive;
    if (sensitiveNote) payload.sensitive_data_note = sensitiveNote;
    payload.summary =
      [fields.art?.value, fields.schule?.value, fields.termin?.value]
        .filter(Boolean).join(" · ") || "Telefonat";
    try {
      const res = await fetch("/api/live-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.id) {
        setToast("Anfrage angelegt — erscheint im Posteingang.");
        setTimeout(() => router.push(`/inquiry/${data.id}`), 1200);
      } else throw new Error();
    } catch {
      setToast("Konnte die Anfrage nicht speichern. Läuft die Datenbank?");
      setSaving(false);
    }
  }

  const hasData = Object.keys(fields).length > 0;
  const live = status === "listening";

  // Campos obligatorios para una Anfrage (mismo criterio que el flujo de e-mail).
  // Lo que falta se avisa para poder pedirlo al anrufer ANTES de colgar.
  const REQUIRED = ["schule", "kontakt", "art", "termin", "personen"];
  const missingLabels = REQUIRED
    .filter((k) => !fields[k]?.value)
    .map((k) => FIELDS.find((f) => f.key === k).label);

  // Citas a resaltar en el transcript, derivadas de los campos detectados.
  const marks = FIELDS
    .filter((f) => f.mark && fields[f.key]?.quote)
    .map((f) => ({ quote: fields[f.key].quote, type: f.mark, low: fields[f.key].low }));

  // Tokens de un segmento: si ya vienen marcados (mock/archivo) se respetan;
  // si es texto plano (live) se re-tokeniza con las citas actuales.
  const segTokens = (seg) =>
    seg.tokens.some((t) => t.mark)
      ? seg.tokens
      : tokenize(seg.tokens.map((t) => t.text).join(""), marks);

  // Marca resaltada activa: la del ratón (hover) o, si no, la fijada con clic.
  const activeMark = hot || pinned;

  const renderTokens = (toks) =>
    toks.map((tk, j) => {
      if (!tk.mark) return <span key={j}>{tk.text}</span>;
      const sensitive = tk.mark.type === "sensitive";
      const blur = sensitive && !showSensitive;
      const cls = ["tr-mark", `tr-mark--${tk.mark.type}`, tk.mark.low && "lowconf", activeMark === tk.mark.type && "hot", blur && "is-blur"]
        .filter(Boolean).join(" ");
      // Al picar la marca: si es sensible, revelar; y en todo caso fijar su tipo
      // para que se ilumine su label en la tarjeta de la derecha (clic de nuevo lo quita).
      const onClick = () => {
        if (sensitive) setShowSensitive(true);
        setPinned((p) => (p === tk.mark.type ? null : tk.mark.type));
      };
      const fieldLabel = FIELDS.find((f) => f.mark === tk.mark.type)?.label;
      return (
        <mark
          key={j}
          className={cls}
          style={{ cursor: "pointer" }}
          title={sensitive ? "Sensible Daten — zum Anzeigen klicken" : fieldLabel ? `${fieldLabel} — klicken zum Hervorheben` : undefined}
          onClick={onClick}
        >
          {tk.text}
        </mark>
      );
    });

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      {/* sub-header */}
      <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 14 }}>
        <span className="db-pill db-pill-burgundy"><Icon d={I.clock} size={11} /> Telefon · Live</span>
        {status === "idle" && <span className="db-faint" style={{ fontSize: 12 }}>Bereit für eingehende Anrufe.</span>}
        {live && (
          <span className="await-banner" style={{ padding: "5px 12px" }}>
            <span className="pulse" /> Hört zu — Transkription läuft…
          </span>
        )}
        {status === "ended" && <Pill tone="neutral">Anruf beendet</Pill>}
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {status === "idle" || status === "ended" ? (
            <>
              <Btn kind="secondary" size="sm" onClick={() => answer("incomplete")}>
                Beispiel: unvollständig
              </Btn>
              <Btn kind="secondary" size="sm" onClick={answerReal}>
                Echte Aufnahme
              </Btn>
              <Btn kind="secondary" size="sm" onClick={answerLive}>
                Live (Mikrofon)
              </Btn>
              <Btn kind="sage" icon="clock" onClick={() => answer("complete")}>
                {status === "ended" ? "Neuer Anruf" : "Anruf annehmen"}
              </Btn>
            </>
          ) : (
            <Btn kind="secondary" icon="x" onClick={hangup}>Auflegen</Btn>
          )}
        </span>
      </div>

      {/* split: transcript | datos */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* TRANSCRIPT */}
        <section ref={scrollRef} className="db-scroll" style={{ flex: "1 1 56%", minWidth: 0, padding: 22, borderRight: "1px solid var(--db-line)" }}>
          <div className="db-card-title" style={{ marginBottom: 10 }}>Transkript</div>
          {/* Leyenda de colores: qué tipo de dato resalta cada color (igual que en e-mails) */}
          {(segments.length > 0 || partialText) && (
            <div className="tr-legend">
              <span className="tr-key"><i className="tr-sw tr-mark--school" /> Schule</span>
              <span className="tr-key"><i className="tr-sw tr-mark--contact" /> Kontakt</span>
              <span className="tr-key"><i className="tr-sw tr-mark--date" /> Zeitraum</span>
              <span className="tr-key"><i className="tr-sw tr-mark--people" /> Personen</span>
              <span className="tr-key"><i className="tr-sw tr-mark--grade" /> Jahrgang</span>
              <span className="tr-key"><i className="tr-sw tr-mark--program" /> Programm</span>
              <span className="tr-key"><i className="tr-sw tr-mark--sensitive" /> Sensibel</span>
            </div>
          )}
          {segments.length === 0 && !partialText ? (
            <div className="db-empty" style={{ padding: "40px 24px" }}>
              <Icon d={I.clock} size={22} />
              <div>Noch kein Anruf. Klicke auf <b>„Anruf annehmen"</b>, um die Live-Transkription zu sehen.</div>
            </div>
          ) : (
            <div className="transcript">
              {segments.map((seg, i) => (
                <div key={i} className={`tr-seg ${i === segments.length - 1 ? "flash" : ""}`}>
                  <div className="tr-meta">
                    <div className="tr-time">{seg.t}</div>
                    {seg.spk && <div className={`tr-spk ${seg.spk}`}>{SPK_LABEL[seg.spk]}</div>}
                  </div>
                  <div className="tr-text">{renderTokens(segTokens(seg))}</div>
                </div>
              ))}
              {partialText && (
                <div className="tr-seg">
                  <div className="tr-meta"><div className="tr-time">…</div></div>
                  <div className="tr-text" style={{ color: "var(--db-text-faint)" }}>{renderTokens(tokenize(partialText, marks))}</div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* DATOS + acciones */}
        <section style={{ flex: "1 1 44%", minWidth: 0, display: "flex", flexDirection: "column", background: "var(--db-paper)" }}>
          <div style={{ padding: "16px 18px 10px", borderBottom: "1px solid var(--db-line)" }}>
            <div className="db-card-title">Automatisch erkannte Daten</div>
            <div className="db-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
              Aktualisiert sich live während des Gesprächs.
            </div>
          </div>

          <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: "8px 14px 14px" }}>
            {FIELDS.map((f) => {
              const data = fields[f.key];
              const has = !!data?.value;
              const sensitive = f.key === "sonder" && data?.sensitive;
              return (
                <div
                  key={f.key}
                  className={`ex-field ${f.mark && activeMark === f.mark ? "is-hot" : ""}`}
                  style={{ gridTemplateColumns: "18px 130px 1fr auto" }}
                  onMouseEnter={() => f.mark && setHot(f.mark)}
                  onMouseLeave={() => setHot(null)}
                  onClick={() => f.mark && setPinned((p) => (p === f.mark ? null : f.mark))}
                >
                  <span className={`ex-state ${has ? (data.low ? "review" : "verified") : "missing"}`}>
                    <Icon d={has ? (data.low ? I.clock : I.check) : I.x} size={11} stroke={2.2} />
                  </span>
                  <span className="ex-label">{f.label}</span>
                  <span className={`ex-value ${has ? "" : "missing"}`}>
                    {has ? (
                      sensitive && !showSensitive ? (
                        <span className="is-blur" onClick={() => setShowSensitive(true)}>{data.value}</span>
                      ) : (
                        data.value
                      )
                    ) : live ? "…" : "— fehlt —"}
                  </span>
                  <span>
                    {has && data.conf != null && (
                      <span style={{ fontFamily: "var(--db-font-mono)", fontSize: 10.5, color: "var(--db-text-faint)" }}>
                        {Math.round(data.conf * 100)}%
                      </span>
                    )}
                  </span>
                </div>
              );
            })}

            {status !== "idle" &&
              (missingLabels.length > 0 ? (
                <div
                  className="followup"
                  style={{ marginTop: 12, borderColor: status === "ended" ? "var(--db-warn)" : undefined }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Icon d={I.alert} size={14} style={{ color: "var(--db-warn)" }} />
                    <b style={{ fontSize: 12.5, color: "#7a4a14" }}>
                      {status === "ended" ? "Vor Abschluss noch erfragen" : "Noch offen — beim Anrufer erfragen"}
                    </b>
                  </div>
                  <div className="db-muted" style={{ fontSize: 12 }}>
                    Fehlt: {missingLabels.join(", ")}.
                  </div>
                </div>
              ) : (
                <div className="sent-banner" style={{ marginTop: 12 }}>
                  <Icon d={I.check} size={15} style={{ color: "#2e5430" }} />
                  <div style={{ fontSize: 12.5 }}>Alle Pflichtangaben erfasst.</div>
                </div>
              ))}

            {sensitiveNote && (
              <div className="kc-note" style={{ marginTop: 12 }}>
                <Icon d={I.shield} size={14} />
                <div><b>Sensible Daten erkannt.</b> {sensitiveNote}. Nur das Nötige speichern (Anzahl, nicht Namen).</div>
              </div>
            )}

            {suggestion && (
              <div className="followup" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Icon d={I.spark} size={15} style={{ color: "var(--db-secondary)", marginTop: 1 }} />
                <div style={{ fontSize: 12.5 }}>{suggestion}</div>
              </div>
            )}
          </div>

          {/* barra de aprobación (human-in-the-loop) */}
          <div className="db-approve-bar">
            {status === "ended" ? (
              missingLabels.length ? (
                <Pill tone="warn">Nachfrage nötig</Pill>
              ) : (
                <Pill tone="success">Bereit zur Prüfung</Pill>
              )
            ) : (
              <Pill tone="warn">Gespräch läuft</Pill>
            )}
            <span className="db-muted" style={{ fontSize: 11.5 }}>Prüfen und als Anfrage anlegen.</span>
            <span style={{ marginLeft: "auto" }}>
              <Btn
                kind="primary"
                iconR="arrowRight"
                disabled={!hasData || saving}
                style={!hasData || saving ? { opacity: 0.5, cursor: "default" } : undefined}
                onClick={() => hasData && !saving && createAnfrage()}
              >
                {saving ? "Wird angelegt…" : "Anfrage anlegen"}
              </Btn>
            </span>
          </div>
        </section>
      </div>

      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 50, background: "var(--db-primary)", color: "#fbf6e9", padding: "12px 18px", borderRadius: 10, boxShadow: "0 8px 24px -6px rgba(40,20,25,.4)", display: "flex", alignItems: "center", gap: 10, fontSize: 13, maxWidth: 460 }}>
          <Icon d={I.check} size={16} stroke={2.2} /> {toast}
        </div>
      )}
    </div>
  );
}
