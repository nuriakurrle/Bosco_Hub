// app/api/live-call/stream/route.js
// ─────────────────────────────────────────────────────────────────────────────
// SSE (Server-Sent Events) que SIMULA una llamada en vivo para la DEMO (Fase 1).
// Reproduce un guion fijo en alemán con pequeños retardos, para enseñar la
// experiencia "transcripción + resaltado en vivo" sin gastar en Twilio/STT.
//
// Dos escenarios (query ?scenario=):
//   complete   → llamada con todos los datos (Realschule Bruckmühl)
//   incomplete → llamada con datos que faltan (Max Mustermann) → avisa qué falta
//
// En producción este endpoint lo reemplaza el microservicio `live-call/`:
//   audio real (Twilio) → STT en streaming → NER/extracción → estos mismos eventos.
// El dashboard no nota la diferencia: consume los mismos mensajes.
// Ver CALL-TRANSCRIPTION.md.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

// Atajos para construir los trozos ("tokens") de cada frase del transcript.
// Un token con `mark` se pinta resaltado (color según el tipo de entidad).
const mark = (text, type, low = false) => ({ text, mark: { type, low } });
const txt = (text) => ({ text });

// Escenario 1: llamada completa — Realschule Bruckmühl pide Orientierungstage.
const COMPLETE = [
  { wait: 400, event: { type: "status", value: "listening" } },

  { wait: 600, event: { type: "segment", seg: {
    t: "00:02", spk: "staff",
    tokens: [txt("Aktionszentrum Benediktbeuern, grüß Gott!")],
  } } },

  { wait: 1600, event: { type: "segment", seg: {
    t: "00:06", spk: "caller",
    tokens: [
      txt("Guten Tag, hier ist "),
      mark("Frau Bagger", "contact"),
      txt(" von der "),
      mark("Realschule Bruckmühl", "school"),
      txt("."),
    ],
  } } },
  { wait: 150, event: { type: "fields", fields: {
    schule: { value: "Realschule Bruckmühl", conf: 0.96 },
    kontakt: { value: "Frau Bagger", conf: 0.9 },
  } } },

  { wait: 1500, event: { type: "segment", seg: {
    t: "00:11", spk: "caller",
    tokens: [
      txt("Wir würden gern zu den "),
      mark("Orientierungstagen", "program"),
      txt(" kommen, "),
      mark("vom 15. bis 17. Februar", "date"),
      txt("."),
    ],
  } } },
  { wait: 150, event: { type: "fields", fields: {
    art: { value: "Orientierungstage", conf: 0.94 },
    termin: { value: "15.02.2026–17.02.2026", conf: 0.92 },
    // El programa sugiere la casa; baja confianza → el operador lo confirma.
    haus: { value: "Aktionszentrum", conf: 0.7, low: true },
  } } },

  { wait: 1500, event: { type: "segment", seg: {
    t: "00:18", spk: "caller",
    tokens: [
      txt("Wir sind "),
      mark("27 Schüler", "people"),
      txt(" und "),
      mark("zwei Lehrer", "people"),
      txt(", eine "),
      mark("8. Klasse", "grade"),
      txt("."),
    ],
  } } },
  { wait: 150, event: { type: "fields", fields: {
    personen: { value: "27 + 2 Lehrer", conf: 0.9 },
    stufe: { value: "8. Klasse", conf: 0.88 },
  } } },

  { wait: 1700, event: { type: "segment", seg: {
    t: "00:25", spk: "caller",
    tokens: [
      txt("Ach, und "),
      mark("ein Schüler hat eine Erdnussallergie", "sensitive"),
      txt("."),
    ],
  } } },
  { wait: 150, event: { type: "fields", fields: {
    sonder: { value: "1 Allergie (Erdnuss)", conf: 0.85, sensitive: true },
  } } },
  { wait: 150, event: { type: "sensitive",
    note: "Erdnussallergie (1 Person) — Gesundheitsdaten, Art. 9 DSGVO" } },

  { wait: 900, event: { type: "segment", seg: {
    t: "00:31", spk: "staff",
    tokens: [txt("Alles notiert. Ich schaue, ob in der Woche noch Platz ist…")],
  } } },
  { wait: 700, event: { type: "suggestion",
    text: "Aktionszentrum: in dieser Woche noch frei (Vorschlag)." } },

  { wait: 700, event: { type: "status", value: "ended" } },
];

// Escenario 2: llamada incompleta — Max Mustermann olvida la escuela, las fechas
// y el número de personas. El dashboard debe AVISAR qué falta antes de colgar.
const INCOMPLETE = [
  { wait: 400, event: { type: "status", value: "listening" } },

  { wait: 600, event: { type: "segment", seg: {
    t: "00:02", spk: "staff",
    tokens: [txt("Aktionszentrum Benediktbeuern, grüß Gott!")],
  } } },

  { wait: 1500, event: { type: "segment", seg: {
    t: "00:05", spk: "caller",
    tokens: [
      txt("Hallo, hier ist "),
      mark("Max Mustermann", "contact"),
      txt(". Wir würden gern mal vorbeikommen."),
    ],
  } } },
  { wait: 150, event: { type: "fields", fields: {
    kontakt: { value: "Max Mustermann", conf: 0.88 },
  } } },

  { wait: 1300, event: { type: "segment", seg: {
    t: "00:10", spk: "staff",
    tokens: [txt("Sehr gern! Von welcher Schule rufen Sie denn an?")],
  } } },

  { wait: 1600, event: { type: "segment", seg: {
    t: "00:14", spk: "caller",
    tokens: [txt("Ah, das weiß ich gerade nicht genau — ich melde mich nochmal.")],
  } } },

  { wait: 1500, event: { type: "segment", seg: {
    t: "00:19", spk: "caller",
    tokens: [
      txt("So im Frühjahr vielleicht, für "),
      mark("Besinnungstage", "program"),
      txt("."),
    ],
  } } },
  { wait: 150, event: { type: "fields", fields: {
    art: { value: "Besinnungstage", conf: 0.8 },
  } } },

  { wait: 1100, event: { type: "segment", seg: {
    t: "00:24", spk: "staff",
    tokens: [txt("Alles klar. Melden Sie sich gern mit Schule, Zeitraum und Personenzahl.")],
  } } },

  { wait: 700, event: { type: "status", value: "ended" } },
];

const SCRIPTS = { complete: COMPLETE, incomplete: INCOMPLETE };

export async function GET(request) {
  const scenario = new URL(request.url).searchParams.get("scenario");
  const script = SCRIPTS[scenario] || COMPLETE;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      try {
        for (const step of script) {
          await sleep(step.wait);
          send(step.event);
        }
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
