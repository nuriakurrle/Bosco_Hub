// POST /api/inquiries/:id/followup
// Envía la Rückfrage (datos faltantes) al cliente: usa el MISMO webhook del workflow
// de n8n "Send Email" que la confirmación (reusa la credencial de Outlook). A
// diferencia de la confirmación, NO marca la Anfrage como confirmada.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { to, subject, text } = await req.json();
    if (!to) {
      return NextResponse.json({ error: "Empfänger (To) fehlt." }, { status: 400 });
    }

    const base = process.env.N8N_BASE_URL || "http://localhost:5678";
    const res = await fetch(`${base}/webhook/zuk-send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, text }),
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            "n8n hat den Versand nicht akzeptiert. Ist der Workflow 'Send Confirmation Email' aktiv (Publish)?",
          n8nStatus: res.status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/inquiries/[id]/followup", err);
    return NextResponse.json({ error: "send failed" }, { status: 500 });
  }
}
