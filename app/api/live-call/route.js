// app/api/live-call/route.js
// POST → crea una Anfrage en `inquiries` a partir de una llamada (channel='phone').
// Es el "Human Approval": el operador confirma lo transcrito y queda como una
// inquiry normal, idéntica a la de un e-mail. Ver CALL-TRANSCRIPTION.md.
import { NextResponse } from "next/server";
import { createInquiryFromCall } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const data = await req.json();
    const result = await createInquiryFromCall(data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/live-call", err);
    return NextResponse.json(
      { error: "Anfrage konnte nicht gespeichert werden. Läuft der Postgres-Docker?" },
      { status: 500 }
    );
  }
}
