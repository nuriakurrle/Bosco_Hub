// lib/ai.js — Cliente fino de OpenAI (server-side), reutilizable por las funciones
// de IA del dashboard (emails redactados, resúmenes, etc.). La clave sale del
// entorno (OPENAI_API_KEY), igual que en lib/transcribe.js. NUNCA se usa en cliente.
const OPENAI = "https://api.openai.com/v1/chat/completions";

function key() {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("OPENAI_API_KEY fehlt — bitte in .env.local eintragen.");
  return k;
}

// Llama al chat de OpenAI. Con { json: true } fuerza y parsea respuesta JSON.
// Devuelve el texto (o el objeto, si json).
export async function chat(messages, { model = "gpt-4o", temperature = 0.4, json = false } = {}) {
  const res = await fetch(OPENAI, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return json ? JSON.parse(content) : content;
}
