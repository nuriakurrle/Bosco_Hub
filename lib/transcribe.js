// lib/transcribe.js — Fase 3a: transcripción e extracción REALES con IA.
// Transcribe un archivo de audio con Whisper (OpenAI) y extrae los campos de la
// Anfrage con gpt-4o-mini (el mismo modelo que ya usa el workflow de n8n).
// La clave va en .env.local como OPENAI_API_KEY (no se sube al repo).
//
// Sin streaming todavía: Whisper procesa el archivo completo. El endpoint
// /api/live-call/transcribe reproduce luego los segmentos "como en vivo".
// El streaming real (Deepgram) llega en la Fase 3b junto con Twilio.
import { readFile } from "node:fs/promises";

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

const EXTRACT_PROMPT = `Du bist ein Assistent für ein Don-Bosco-Haus (Jugendherberge / Aktionszentrum).
Aus dem Transkript eines Telefonats extrahierst du die Buchungsdaten.
Gib NUR JSON in genau diesem Schema zurück:
{
  "fields": {
    "schule":   {"value": "", "quote": "", "conf": 0.0},
    "kontakt":  {"value": "", "quote": "", "conf": 0.0},
    "art":      {"value": "", "quote": "", "conf": 0.0},
    "haus":     {"value": "", "quote": "", "conf": 0.0},
    "termin":   {"value": "", "quote": "", "conf": 0.0},
    "personen": {"value": "", "quote": "", "conf": 0.0},
    "stufe":    {"value": "", "quote": "", "conf": 0.0},
    "sonder":   {"value": "", "quote": "", "conf": 0.0, "sensitive": false}
  },
  "sensitive_note": "",
  "suggestion": ""
}
Regeln:
- "quote" = der EXAKTE Wortlaut aus dem Transkript, der den Wert belegt (zum Hervorheben). Leer lassen, wenn nicht vorhanden.
- "value" auf Deutsch normalisieren (Datum als TT.MM.JJJJ, wenn möglich).
- "haus": "Aktionszentrum" bei Orientierungstagen/Besinnungstagen, "Jugendherberge" bei Schullandheim. Niedrigere conf, da abgeleitet.
- "personen": Schüler und Begleitpersonen getrennt angeben (z. B. "25 + 2 Lehrer"), NICHT addieren.
- "termin": wenn kein Jahr genannt wird, das nächste zukünftige Jahr annehmen (Format TT.MM.JJJJ).
- Gesundheitsdaten/Allergien → in "sonder" Anzahl UND Art (z. B. "1 Laktoseintoleranz", "2 Vegetarier"), "sensitive": true, und "sensitive_note" mit Hinweis (Art. 9 DSGVO). NIEMALS Klarnamen von Personen.
- Felder ohne Information: "value" leer lassen.`;

// Transcripción completa → campos estructurados (con cita textual y confianza).
export async function extractFields(transcript) {
  const res = await fetch(`${OPENAI}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${EXTRACT_PROMPT}\n\nHeutiges Datum: ${new Date().toISOString().slice(0, 10)}.` },
        { role: "user", content: transcript },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Extraktion (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}
