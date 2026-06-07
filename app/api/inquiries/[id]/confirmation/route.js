// POST /api/inquiries/:id/confirmation
// Sends the confirmation to the customer: calls the webhook of the n8n "Send Email"
// workflow (which reuses the Outlook credential) and marks the inquiry as sent.
import { NextResponse } from "next/server";
import { markConfirmationSent } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const { id } = await params;
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

    await markConfirmationSent(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/inquiries/[id]/confirmation", err);
    return NextResponse.json({ error: "send failed" }, { status: 500 });
  }
}
