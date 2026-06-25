// POST /api/inquiries/:id/draft-email
// Devuelve un borrador de e-mail redactado con IA: { subject, body }.
// NO envía nada — el borrador se muestra en el editor, la persona lo revisa y
// lo manda por el flujo de n8n (Human-in-the-Loop).
// Body: { type: "followup" | "confirmation", context: {...} }
import { NextResponse } from "next/server";
import { draftEmail } from "@/lib/aiEmail";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { type = "followup", context = {} } = await req.json();
    const draft = await draftEmail({ type, context });
    return NextResponse.json(draft);
  } catch (err) {
    console.error("POST /api/inquiries/[id]/draft-email", err);
    return NextResponse.json(
      { error: "KI-Entwurf fehlgeschlagen. Ist OPENAI_API_KEY gesetzt?" },
      { status: 500 }
    );
  }
}
