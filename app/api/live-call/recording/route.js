// app/api/live-call/recording/route.js
// POST → enlaza la grabación de Twilio a la Anfrage (busca por CallSid).
// Lo llama el microservicio live-call al recibir el callback de grabación de Twilio
// (no es público de cara al navegador; el reproductor usa la ruta [id] de abajo).
import { NextResponse } from "next/server";
import { setCallRecording } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { callSid, recordingUrl } = await req.json();
    const id = await setCallRecording(callSid, recordingUrl);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("POST /api/live-call/recording", err);
    return NextResponse.json(
      { error: "Aufnahme konnte nicht verknüpft werden." },
      { status: 500 }
    );
  }
}
