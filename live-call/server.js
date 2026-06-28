// live-call/server.js — Microservicio de transcripción en vivo.
// ─────────────────────────────────────────────────────────────────────────────
// Tres caminos por WebSocket, según el path de conexión:
//   /         Micrófono del navegador (PCM 24 kHz). Bidireccional: recibe audio
//             y devuelve la transcripción al mismo navegador. (Fase 3b-i)
//   /twilio   Twilio Media Streams (µ-law 8 kHz). Recibe el audio de la llamada
//             real; la transcripción se reenvía a los dashboards en /watch. (3b-ii)
//   /watch    Dashboards que quieren VER la transcripción de la llamada Twilio.
//
// OpenAI Realtime acepta g711 µ-law directo (format "audio/pcmu"), así que el
// audio de Twilio NO se transcodifica. La clave OpenAI sale del entorno o de
// ../.env.local. Ver CALL-TRANSCRIPTION.md.
// ─────────────────────────────────────────────────────────────────────────────
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extractFields, FIELD_KEYS } from "./extract.js";

const PORT = process.env.LIVE_CALL_PORT || 8787;
const OAI_URL = "wss://api.openai.com/v1/realtime?intent=transcription";
const MODEL = "gpt-realtime-whisper"; // transcripción en streaming (GA)
const EXTRACT_EVERY_MS = 2500;        // cada cuánto re-extraer los campos

function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const m = env.match(/^OPENAI_API_KEY=(.+)$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}
const KEY = loadKey();


function sendFields(send, ex) {
  const f = ex.fields || {};
  const out = {};
  for (const k of FIELD_KEYS) {
    if (f[k]?.value) {
      out[k] = { value: f[k].value, conf: f[k].conf, low: (f[k].conf || 0) < 0.75, sensitive: !!f[k].sensitive, quote: f[k].quote || "" };
    }
  }
  if (Object.keys(out).length) send({ type: "fields", fields: out });
  if (ex.sensitive_note) send({ type: "sensitive", note: ex.sensitive_note });
  if (ex.suggestion) send({ type: "suggestion", text: ex.suggestion });
}

// Abre una sesión de transcripción con OpenAI Realtime y procesa los resultados.
//   send(obj) = a dónde van los eventos (navegador directo, o broadcast a /watch).
//   format    = formato de audio de entrada (audio/pcm 24k micro · audio/pcmu Twilio).
// Devuelve helpers para empujar audio y cerrar.
function startTranscription(send, format) {
  let transcript = "";    // frases finales
  let partial = "";       // texto parcial del item en curso
  let lastExtract = 0;    // portero compartido
  let extracting = false; // evita extracciones solapadas

  const oai = new WebSocket(OAI_URL, { headers: { Authorization: `Bearer ${KEY}` } });

  async function maybeExtract(base, extra) {
    const now = Date.now();
    if (extracting || now - lastExtract < EXTRACT_EVERY_MS) return;
    const full = [base, extra].filter(Boolean).join(" ").trim();
    if (!full) return;
    lastExtract = now;
    extracting = true;
    try { sendFields(send, await extractFields(full, KEY)); }
    catch (e) { console.error("extract:", e.message); }
    finally { extracting = false; }
  }

  oai.on("open", () => {
    oai.send(JSON.stringify({
      type: "session.update",
      session: { type: "transcription", audio: { input: { format, transcription: { model: MODEL } } } },
    }));
    send({ type: "status", value: "listening" });
  });

  oai.on("message", async (raw) => {
    let ev;
    try { ev = JSON.parse(raw.toString()); } catch { return; }

    if (ev.type === "conversation.item.input_audio_transcription.delta") {
      partial += ev.delta || "";
      send({ type: "partial", text: partial });
      maybeExtract(transcript, partial);
      return;
    }
    if (ev.type === "conversation.item.input_audio_transcription.completed") {
      const text = (ev.transcript || partial).trim();
      partial = "";
      send({ type: "partial", text: "" });
      if (!text) return;
      transcript += (transcript ? " " : "") + text;
      send({ type: "segment", seg: { t: "", spk: ev.speaker ?? null, tokens: [{ text }] } });
      maybeExtract(transcript, "");
      return;
    }
    if (ev.type === "error") {
      console.error("OpenAI:", JSON.stringify(ev.error || ev));
      send({ type: "error", message: ev.error?.message || "OpenAI Realtime Fehler" });
      return;
    }
    console.log("oai event:", ev.type);
  });

  oai.on("error", (e) => { console.error("oai ws:", e.message); send({ type: "error", message: String(e.message) }); });

  return {
    append: (b64) => { if (oai.readyState === WebSocket.OPEN) oai.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 })); },
    commit: () => { if (oai.readyState === WebSocket.OPEN) oai.send(JSON.stringify({ type: "input_audio_buffer.commit" })); },
    finish: async () => { if (transcript.trim()) { try { sendFields(send, await extractFields(transcript, KEY)); } catch {} } },
    close: () => oai.close(),
  };
}

// ── Dashboards suscritos para ver la llamada de Twilio (broadcast simple) ──────
// Nota: para un piloto se difunde a todos los /watch conectados. El enrutado por
// operador (llamada → pantalla de quien la atendió) se afina más adelante.
const watchers = new Set();
let callActive = false; // ¿hay una llamada Twilio en curso? (para el aviso global)
function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const ws of watchers) if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

// Guarda la llamada en `inquiries` al colgar (channel='phone'), reusando el
// endpoint del dashboard. Así NINGUNA llamada se pierde, la vea alguien o no.
const COL = {
  schule: "school_name", kontakt: "contact_person", art: "program_type",
  haus: "house", termin: "date_range", personen: "number_of_people",
  stufe: "grade_level", sonder: "special_requirements",
};
async function saveCall(transcript, fields, sensitiveNote, callSid) {
  const url = process.env.DASHBOARD_URL || "http://localhost:3000";
  const payload = { channel: "phone", raw_body: transcript };
  for (const [k, col] of Object.entries(COL)) {
    if (fields[k]?.value) payload[col] = fields[k].value;
  }
  payload.contains_sensitive_data = !!sensitiveNote || !!fields.sonder?.sensitive;
  if (sensitiveNote) payload.sensitive_data_note = sensitiveNote;
  if (callSid) payload.call_sid = callSid; // enlace a la grabación de Twilio
  payload.summary =
    [fields.art?.value, fields.schule?.value, fields.termin?.value].filter(Boolean).join(" · ") || "Telefonat";
  try {
    const res = await fetch(`${url}/api/live-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log("Llamada guardada como Anfrage:", data.id || JSON.stringify(data));
  } catch (e) {
    console.error("guardar llamada:", e.message);
  }
}

// ── /  : micrófono del navegador (bidireccional) ──────────────────────────────
function handleMic(browser) {
  const send = (o) => browser.readyState === WebSocket.OPEN && browser.send(JSON.stringify(o));
  if (!KEY) { send({ type: "error", message: "OPENAI_API_KEY fehlt." }); browser.close(); return; }
  const t = startTranscription(send, { type: "audio/pcm", rate: 24000 });
  let chunks = 0;
  browser.on("message", (data, isBinary) => {
    if (isBinary) {
      chunks++;
      if (chunks % 50 === 1) console.log(`mic: ${chunks} chunks`);
      t.append(data.toString("base64"));
      return;
    }
    try { const m = JSON.parse(data.toString()); if (m.type === "stop") t.commit(); } catch {}
  });
  browser.on("close", async () => { await t.finish(); t.close(); });
}

// ── /twilio : audio de la llamada real → transcripción a los dashboards (/watch) ─
function handleTwilio(twilio) {
  if (!KEY) { twilio.close(); return; }
  console.log("Twilio: stream conectado");
  callActive = true;
  broadcast({ type: "reset" });               // limpia la pantalla al empezar
  broadcast({ type: "call", active: true });  // enciende el aviso global

  // Capturamos transcript + últimos campos + CallSid para guardar la llamada al colgar.
  let lastFields = {}, sensNote = null, fullText = "", callSid = null;
  const send = (obj) => {
    broadcast(obj);
    if (obj.type === "fields") lastFields = { ...lastFields, ...obj.fields };
    else if (obj.type === "sensitive") sensNote = obj.note;
    else if (obj.type === "segment") fullText += (fullText ? " " : "") + obj.seg.tokens.map((t) => t.text).join("");
  };

  const t = startTranscription(send, { type: "audio/pcmu" });
  twilio.on("message", (raw) => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.event === "media") t.append(m.media.payload);
    else if (m.event === "start") { callSid = m.start?.callSid || null; console.log("Twilio start:", callSid || ""); }
    else if (m.event === "stop") t.commit();
  });
  twilio.on("close", async () => {
    callActive = false;
    await t.finish(); // difunde la extracción final → se captura en lastFields
    t.close();
    broadcast({ type: "status", value: "ended" });
    broadcast({ type: "call", active: false }); // apaga el aviso global
    if (fullText.trim()) await saveCall(fullText, lastFields, sensNote, callSid); // registro automático
  });
}

// ── /watch : un dashboard que quiere ver la llamada Twilio en curso ────────────
function handleWatch(ws) {
  // Al conectar le decimos si YA hay una llamada en curso (para el aviso global y
  // para que la consola se muestre sola); si no, se queda a la espera.
  watchers.add(ws);
  ws.send(JSON.stringify({ type: "call", active: callActive }));
  ws.on("close", () => watchers.delete(ws));
}

// ── Callback HTTP de Twilio: la grabación de la llamada ya está lista ──────────
// Twilio hace POST form-urlencoded (CallSid, RecordingUrl, ...). Enlazamos la
// grabación a la Anfrage por CallSid vía el dashboard. Esta ruta llega por
// boscohub.duckdns.org/twilio-recording (Caddy, sin login — Twilio no autentica).
function handleRecordingCallback(req, res) {
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on("end", () => {
    res.writeHead(204); // responder a Twilio YA; no bloquear su callback con el enlace
    res.end();
    try {
      const p = new URLSearchParams(body);
      const callSid = p.get("CallSid");
      const recordingUrl = p.get("RecordingUrl");
      if (callSid && recordingUrl) {
        const url = process.env.DASHBOARD_URL || "http://localhost:3000";
        // En 2º plano: el dashboard reintenta hasta que exista la Anfrage de la llamada
        // (se crea unos segundos después de colgar, tras la extracción final).
        fetch(`${url}/api/live-call/recording`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callSid, recordingUrl }),
        }).then((r) => console.log("Grabación enlazada:", callSid, r.status))
          .catch((e) => console.error("recording→dashboard:", e.message));
      }
    } catch (e) { console.error("recording callback:", e.message); }
  });
}

const server = createServer((req, res) => {
  const path = (req.url || "/").split("?")[0];
  if (req.method === "POST" && path === "/twilio-recording") return handleRecordingCallback(req, res);
  res.writeHead(426);
  res.end("WebSocket only");
});
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    const path = (req.url || "/").split("?")[0];
    if (path === "/twilio") handleTwilio(ws);
    else if (path === "/watch") handleWatch(ws);
    else handleMic(ws);
  });
});

server.listen(PORT, () => console.log(`live-call listo en ws://localhost:${PORT}` + (KEY ? "" : "  ⚠ OPENAI_API_KEY fehlt")));
