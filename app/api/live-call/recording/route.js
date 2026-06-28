// app/api/live-call/recording/route.js
// POST → enlaza la grabación de Twilio a la Anfrage (busca por CallSid).
// Lo llama el microservicio live-call al recibir el callback de grabación de Twilio
// (no es público de cara al navegador; el reproductor usa la ruta [id] de abajo).
import { NextResponse } from "next/server";
import { setCallRecording } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function POST(req) {
  try {
    const { callSid, recordingUrl } = await req.json();
    // Carrera: la Anfrage de la llamada se INSERTA unos segundos después de colgar
    // (tras la extracción final), así que el callback de Twilio puede llegar antes de
    // que exista la fila con ese call_sid. Reintentamos hasta ~24s antes de rendirnos.
    for (let i = 0; i < 12; i++) {
      const id = await setCallRecording(callSid, recordingUrl);
      if (id) return NextResponse.json({ ok: true, id });
      await sleep(2000);
    }
    console.warn("recording: keine Anfrage mit call_sid", callSid);
    return NextResponse.json({ ok: false, reason: "inquiry_not_found" }, { status: 202 });
  } catch (err) {
    console.error("POST /api/live-call/recording", err);
    return NextResponse.json(
      { error: "Aufnahme konnte nicht verknüpft werden." },
      { status: 500 }
    );
  }
}
