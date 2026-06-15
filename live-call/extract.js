// live-call/extract.js — extracción de campos con gpt-4o-mini (mismo prompt que
// lib/transcribe.js, pero autocontenido para el microservicio Node).
const PROMPT = `Du bist ein Assistent für ein Don-Bosco-Haus (Jugendherberge / Aktionszentrum).
Aus dem (laufenden) Transkript eines Telefonats extrahierst du die Buchungsdaten.
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
- "value" auf Deutsch normalisieren (Datum TT.MM.JJJJ; wenn kein Jahr genannt, nächstes zukünftiges Jahr).
- "haus": "Aktionszentrum" bei Orientierungstagen/Besinnungstagen, "Jugendherberge" bei Schullandheim (niedrigere conf, da abgeleitet).
- "personen": Schüler und Begleitpersonen getrennt (z. B. "25 + 2 Lehrer"), NICHT addieren.
- Gesundheitsdaten/Allergien → in "sonder" Anzahl UND Art (z. B. "1 Laktoseintoleranz"), "sensitive": true, "sensitive_note" mit Hinweis (Art. 9 DSGVO). NIEMALS Klarnamen.
- Felder ohne Information: "value" leer lassen.`;

export async function extractFields(transcript, key) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${PROMPT}\n\nHeutiges Datum: ${new Date().toISOString().slice(0, 10)}.` },
        { role: "user", content: transcript },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Extraktion (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}
