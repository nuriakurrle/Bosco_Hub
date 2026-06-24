// POST /api/bookings/:id/contract/send
// Envía el contrato al cliente como ADJUNTO PDF: genera el PDF a partir del texto,
// lo manda al webhook de n8n "zuk-send-contract" (que lo adjunta y envía por Outlook)
// y, solo si el envío fue aceptado, marca la reserva como "sent".
// Body: { to, subject, text, pdfText, filename }
//   text    = cuerpo del e-mail (nota breve); pdfText = contenido del contrato (PDF).
import { NextResponse } from "next/server";
import { updateContractStatus } from "@/lib/contracts";
import { textToPdfBase64 } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const { id } = await params;
  try {
    const { to, subject, text, pdfText, filename } = await req.json();
    if (!to) return NextResponse.json({ error: "Empfänger (To) fehlt." }, { status: 400 });
    if (!pdfText) return NextResponse.json({ error: "Vertragstext fehlt." }, { status: 400 });

    const pdfBase64 = textToPdfBase64(pdfText);
    const file = filename || `Buchungsbestaetigung-${id}.pdf`;

    const base = process.env.N8N_BASE_URL || "http://localhost:5678";
    const res = await fetch(`${base}/webhook/zuk-send-contract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, text, filename: file, pdfBase64 }),
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            "n8n hat den Versand nicht akzeptiert. Ist der Workflow 'ZUK - Send Contract' aktiv (Publish)?",
          n8nStatus: res.status,
        },
        { status: 502 }
      );
    }

    await updateContractStatus(id, "sent");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/bookings/[id]/contract/send", err);
    return NextResponse.json({ error: "send failed" }, { status: 500 });
  }
}
