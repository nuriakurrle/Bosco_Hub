// app/api/live-call/transcribe/route.js — Fase 3a.
// SSE que transcribe un archivo de audio REAL (de live-call/samples/) con Whisper,
// extrae los campos con gpt-4o-mini y los emite con los MISMOS eventos que el mock,
// reproduciendo los segmentos "como en vivo". La pantalla no cambia.
// Ver lib/transcribe.js y CALL-TRANSCRIPTION.md.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { transcribeAudio, extractFields } from "@/lib/transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLES_DIR = path.join(process.cwd(), "live-call", "samples");
const AUDIO_EXT = /\.(mp3|wav|m4a|ogg|webm|mp4|mpga|mpeg)$/i;

// Tipo de resaltado por campo (haus no se resalta en el transcript).
const MARK_TYPE = {
  schule: "school", kontakt: "contact", art: "program",
  termin: "date", personen: "people", stufe: "grade", sonder: "sensitive",
};

// Elige el archivo de audio: el indicado por ?file=, o el primero de la carpeta.
async function pickFile(name) {
  const files = await readdir(SAMPLES_DIR).catch(() => []);
  const audios = files.filter((f) => AUDIO_EXT.test(f));
  if (name && audios.includes(name)) return name;
  return audios[0] || null;
}

// Parte el texto de un segmento en tokens, resaltando las citas que caen dentro.
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

const fmt = (sec) => {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export async function GET(request) {
  const file = new URL(request.url).searchParams.get("file");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(o)}\n\n`));
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      try {
        const picked = await pickFile(file);
        if (!picked) {
          send({ type: "error", message: "Keine Audiodatei in live-call/samples/. Lege dort z. B. anruf.mp3 ab." });
          send({ type: "done" });
          return;
        }

        send({ type: "status", value: "listening" });

        // 1) Transcripción (Whisper) y 2) extracción (gpt-4o-mini).
        const { text, segments } = await transcribeAudio(path.join(SAMPLES_DIR, picked));
        const extracted = await extractFields(text);
        const fieldsObj = extracted.fields || {};

        // Citas a resaltar y en qué segmento aparece cada campo por primera vez.
        const marks = Object.entries(fieldsObj)
          .filter(([k, v]) => v && v.quote && MARK_TYPE[k])
          .map(([k, v]) => ({ key: k, quote: v.quote, type: MARK_TYPE[k], low: (v.conf || 0) < 0.75 }));
        const firstSeg = {};
        for (const m of marks) firstSeg[m.key] = segments.findIndex((s) => s.text.includes(m.quote));

        const toField = (v) => ({
          value: v.value, conf: v.conf,
          low: (v.conf || 0) < 0.75, sensitive: !!v.sensitive,
        });

        // 3) Reproducir los segmentos con un ritmo agradable (no en tiempo 1:1).
        let prev = 0;
        for (let i = 0; i < segments.length; i++) {
          const s = segments[i];
          const gap = Math.min(1600, Math.max(350, (s.start - prev) * 500));
          prev = s.start;
          await sleep(gap);

          const segMarks = marks.filter((m) => s.text.includes(m.quote));
          send({ type: "segment", seg: { t: fmt(s.start), spk: null, tokens: tokenize(s.text, segMarks) } });

          const now = {};
          for (const [k, idx] of Object.entries(firstSeg)) {
            if (idx === i) now[k] = toField(fieldsObj[k]);
          }
          if (Object.keys(now).length) send({ type: "fields", fields: now });
        }

        // Campos con valor pero sin cita localizada (incl. haus) → al final.
        const tail = {};
        for (const [k, v] of Object.entries(fieldsObj)) {
          if (!v || !v.value) continue;
          const idx = firstSeg[k];
          if (idx == null || idx < 0) tail[k] = toField(v);
        }
        if (Object.keys(tail).length) send({ type: "fields", fields: tail });

        if (extracted.sensitive_note) send({ type: "sensitive", note: extracted.sensitive_note });
        if (extracted.suggestion) send({ type: "suggestion", text: extracted.suggestion });
        send({ type: "status", value: "ended" });
        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: String(e?.message || e) });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
