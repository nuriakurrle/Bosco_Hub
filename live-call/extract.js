// live-call/extract.js — FUENTE ÚNICA de la extracción de campos de una llamada.
// La usan tanto el microservicio (live-call/server.js) como el dashboard
// (lib/transcribe.js la re-exporta). Antes el prompt y el esquema estaban
// duplicados en los dos sitios y empezaban a divergir; ahora viven aquí.
//
// Nota: el agente de e-mail en n8n usa OTRO esquema (varias reservas, columnas de
// BD, missing_fields/status) porque su propósito es distinto — ese no se unifica.
export const FIELD_KEYS = ["schule", "kontakt", "art", "haus", "termin", "personen", "stufe", "sonder"];

export const EXTRACT_PROMPT = `Du bist ein Assistent für ein Don-Bosco-Haus (Jugendherberge / Aktionszentrum).
Aus dem (ggf. noch laufenden) Transkript eines Telefonats extrahierst du die Buchungsdaten.
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
- "value" auf Deutsch normalisieren (Datum als TT.MM.JJJJ).
- "termin": wenn kein Jahr genannt wird, das nächste zukünftige Jahr annehmen (Format TT.MM.JJJJ).
- "haus": "Aktionszentrum" bei Orientierungstagen/Besinnungstagen, "Jugendherberge" bei Schullandheim (niedrigere conf, da abgeleitet).
- "personen": Schüler und Begleitpersonen getrennt angeben (z. B. "25 + 2 Lehrer"), NICHT addieren.
- Ernährung/Gesundheit/Allergien (auch vegetarisch, vegan, Laktose, Erdnuss …) → in "sonder" Anzahl UND konkrete Art (z. B. "1 Vegetarier", "1 Laktoseintoleranz"). "quote" = das konkrete Stichwort (z. B. "vegetarian"), NICHT ein allgemeiner Satz. "sensitive": true und "sensitive_note" mit Hinweis (Art. 9 DSGVO). NIEMALS Klarnamen von Personen.
- Felder ohne Information: "value" leer lassen.`;

// Transcript → campos estructurados (con cita textual y confianza).
// `key` por defecto sale del entorno (dashboard); el microservicio le pasa su KEY.
export async function extractFields(transcript, key = process.env.OPENAI_API_KEY) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
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
