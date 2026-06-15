// live-call/server.js — Microservicio de transcripción en vivo (Fase 3b-i).
// ─────────────────────────────────────────────────────────────────────────────
// Cada navegador conecta por WebSocket y envía audio del micrófono (PCM 24 kHz).
// El microservicio abre una sesión de transcripción con OpenAI Realtime, le
// reenvía el audio, y devuelve al navegador los MISMOS eventos que ya consume el
// dashboard (segment / fields / sensitive / suggestion / status).
//
// Arranque:  cd live-call && npm install && npm start
// La clave OpenAI se toma de la variable de entorno o de ../.env.local.
//
// En la Fase 3b-ii, Twilio sustituye al micrófono del navegador como fuente de
// audio (Media Streams) — el resto de este servicio no cambia.
// ─────────────────────────────────────────────────────────────────────────────
import { WebSocketServer, WebSocket } from "ws";
import { readFileSync } from "node:fs";
import { extractFields } from "./extract.js";

const PORT = process.env.LIVE_CALL_PORT || 8787;
const OAI_URL = "wss://api.openai.com/v1/realtime?intent=transcription";
const MODEL = "gpt-realtime-whisper"; // modelo de transcripción en streaming (GA). Diarización: por canal con Twilio (3b-ii).
const EXTRACT_EVERY_MS = 2500;             // cada cuánto re-extraer los campos (latencia vs. coste)

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

const wss = new WebSocketServer({ port: PORT });
console.log(`live-call listo en ws://localhost:${PORT}` + (KEY ? "" : "  ⚠ OPENAI_API_KEY fehlt"));

wss.on("connection", (browser) => {
  const send = (o) => browser.readyState === WebSocket.OPEN && browser.send(JSON.stringify(o));
  if (!KEY) { send({ type: "error", message: "OPENAI_API_KEY fehlt (in .env.local eintragen)." }); browser.close(); return; }

  let transcript = "";    // frases finales transcritas
  let partial = "";       // texto parcial del item en curso (tiempo real)
  let lastExtract = 0;     // portero compartido: ambos disparadores pasan por aquí
  let extracting = false;  // evita dos extracciones solapadas
  let audioChunks = 0;

  // Único punto de extracción. Lo llaman el throttle (delta) y la frase final
  // (completed); el portero (lastExtract + extracting) impide que choquen.
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

  // Sesión de transcripción con OpenAI Realtime.
  // GA Realtime API: sin el header OpenAI-Beta (la Beta fue retirada).
  const oai = new WebSocket(OAI_URL, {
    headers: { Authorization: `Bearer ${KEY}` },
  });

  oai.on("open", () => {
    oai.send(JSON.stringify({
      type: "session.update",
      session: {
        type: "transcription",
        audio: { input: {
          format: { type: "audio/pcm", rate: 24000 },
          transcription: { model: MODEL },
        } },
      },
    }));
    send({ type: "status", value: "listening" });
  });

  oai.on("message", async (raw) => {
    let ev;
    try { ev = JSON.parse(raw.toString()); } catch { return; }

    // Disparador 1 (throttle): texto parcial en vivo; intenta extraer sobre todo
    // lo dicho, sin esperar a una pausa. El portero decide si pasa.
    if (ev.type === "conversation.item.input_audio_transcription.delta") {
      partial += ev.delta || "";
      send({ type: "partial", text: partial });
      maybeExtract(transcript, partial);
      return;
    }

    // Disparador 2 (frase final): fija la frase y vuelve a intentar (mismo portero).
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

    console.log("oai event:", ev.type); // otros eventos (depuración)
  });

  oai.on("error", (e) => { console.error("oai ws:", e.message); send({ type: "error", message: String(e.message) }); });
  oai.on("close", () => browser.readyState === WebSocket.OPEN && browser.close());

  // Audio del navegador (binario PCM16) → OpenAI.
  browser.on("message", (data, isBinary) => {
    if (isBinary) {
      if (oai.readyState === WebSocket.OPEN) {
        audioChunks++;
        if (audioChunks % 50 === 1) console.log(`audio del navegador: ${audioChunks} chunks (último ${data.length} bytes)`);
        oai.send(JSON.stringify({ type: "input_audio_buffer.append", audio: data.toString("base64") }));
      }
      return;
    }
    // Mensaje de control (texto): "stop" = cerrar la última frase pendiente.
    try {
      const m = JSON.parse(data.toString());
      if (m.type === "stop" && oai.readyState === WebSocket.OPEN) {
        oai.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      }
    } catch {}
  });

  browser.on("close", async () => {
    // Una última extracción con todo el transcript antes de cerrar.
    if (transcript.trim()) {
      try { sendFields(send, await extractFields(transcript, KEY)); } catch {}
    }
    oai.close();
  });
});

const FIELD_KEYS = ["schule", "kontakt", "art", "haus", "termin", "personen", "stufe", "sonder"];

function sendFields(send, ex) {
  const f = ex.fields || {};
  const out = {};
  for (const k of FIELD_KEYS) {
    if (f[k]?.value) {
      out[k] = { value: f[k].value, conf: f[k].conf, low: (f[k].conf || 0) < 0.75, sensitive: !!f[k].sensitive };
    }
  }
  if (Object.keys(out).length) send({ type: "fields", fields: out });
  if (ex.sensitive_note) send({ type: "sensitive", note: ex.sensitive_note });
  if (ex.suggestion) send({ type: "suggestion", text: ex.suggestion });
}
