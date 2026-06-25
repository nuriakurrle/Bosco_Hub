// lib/transcribe.js — Fase 3a: transcripción e extracción REALES con IA.
// Transcribe un archivo de audio con Whisper (OpenAI) y extrae los campos de la
// Anfrage con gpt-4o-mini (el mismo modelo que ya usa el workflow de n8n).
// La clave va en .env.local como OPENAI_API_KEY (no se sube al repo).
//
// Sin streaming todavía: Whisper procesa el archivo completo. El endpoint
// /api/live-call/transcribe reproduce luego los segmentos "como en vivo".
// El streaming real (Deepgram) llega en la Fase 3b junto con Twilio.
import { readFile } from "node:fs/promises";

// La extracción de campos vive en UN solo sitio (compartida con el microservicio).
// Aquí solo se re-exporta para no cambiar los imports existentes del dashboard.
export { extractFields } from "../live-call/extract.js";

const OPENAI = "https://api.openai.com/v1";

function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY fehlt — bitte in .env.local eintragen.");
  return key;
}

// Audio → texto + segmentos con marcas de tiempo. Sin forzar idioma:
// Whisper detecta alemán o inglés automáticamente.
export async function transcribeAudio(filePath) {
  const buf = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buf]), filePath.split("/").pop());
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");

  const res = await fetch(`${OPENAI}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return {
    text: data.text || "",
    segments: (data.segments || []).map((s) => ({
      start: s.start,
      end: s.end,
      text: (s.text || "").trim(),
    })),
  };
}

