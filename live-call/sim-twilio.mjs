// live-call/sim-twilio.mjs — Simula una llamada de Twilio en LOCAL, sin cuenta de
// Twilio. Convierte un audio de muestra a µ-law 8 kHz (el formato que manda Twilio
// Media Streams) y lo inyecta en el endpoint /twilio del microservicio, frame a
// frame y en tiempo real. Así pruebas TODO el camino real:
//   /twilio → OpenAI (transcripción) → broadcast /watch → consola /llamada
//   → al "colgar" → guardado en `inquiries` (aparece en la pestaña Verlauf).
//
// Uso:
//   1) Arranca el stack:  npm run dev   (en la raíz; levanta dashboard + microservicio)
//   2) Abre el dashboard en /llamada
//   3) En otra terminal:  cd live-call && node sim-twilio.mjs ["samples/mi-audio.m4a"]
//
// Requiere ffmpeg en el PATH (brew install ffmpeg). Por defecto usa el primer
// audio que encuentre en samples/.
import { WebSocket } from "ws";
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PORT = process.env.LIVE_CALL_PORT || 8787;
const FRAME = 160;        // 20 ms de µ-law a 8 kHz = 160 bytes (igual que Twilio)
const FRAME_MS = 20;

// 1) Elegir el audio de muestra.
function pickSample() {
  if (process.argv[2]) return process.argv[2];
  const dir = new URL("./samples/", import.meta.url);
  const f = readdirSync(dir).find((n) => /\.(m4a|mp3|wav|aac|ogg|flac)$/i.test(n));
  if (!f) { console.error("No hay audio en samples/. Pasa una ruta: node sim-twilio.mjs ruta.m4a"); process.exit(1); }
  return fileURLToPath(new URL(f, dir));
}
const sample = pickSample();
console.log("Audio de muestra:", sample);

// 2) Convertir a µ-law 8 kHz mono (raw) con ffmpeg → lo recogemos en un buffer.
function toMulaw(path) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-i", path, "-ar", "8000", "-ac", "1", "-f", "mulaw", "-"]);
    const chunks = [];
    ff.stdout.on("data", (d) => chunks.push(d));
    ff.stderr.on("data", () => {}); // silenciar el log de ffmpeg
    ff.on("error", reject);
    ff.on("close", (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error("ffmpeg salió con código " + code)));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 3) Conectar a /twilio y reproducir el audio como una llamada en vivo.
const audio = await toMulaw(sample);
console.log(`µ-law listo: ${audio.length} bytes (~${Math.round(audio.length / 8000)} s de audio)`);

const ws = new WebSocket(`ws://localhost:${PORT}/twilio`);
ws.on("error", (e) => { console.error("No conecta al microservicio (¿está corriendo en :" + PORT + "?):", e.message); process.exit(1); });

ws.on("open", async () => {
  console.log("Conectado a /twilio — empezando 'llamada'…");
  ws.send(JSON.stringify({ event: "start", start: { callSid: "SIMxxxxxxxx", streamSid: "MZsim" } }));

  // Enviar el audio en frames de 20 ms, a ritmo real.
  for (let i = 0; i < audio.length; i += FRAME) {
    if (ws.readyState !== WebSocket.OPEN) break;
    const payload = audio.subarray(i, i + FRAME).toString("base64");
    ws.send(JSON.stringify({ event: "media", media: { payload } }));
    await sleep(FRAME_MS);
  }

  // "Colgar": cierra el stream → el server hace la extracción final y guarda la
  // llamada en `inquiries`.
  ws.send(JSON.stringify({ event: "stop" }));
  console.log("Audio enviado. Colgando…");
  await sleep(3000); // dar tiempo a la transcripción/extracción/guardado finales
  ws.close();
  console.log("Listo. Revisa /llamada (pestaña Verlauf) y el Posteingang.");
  process.exit(0);
});
