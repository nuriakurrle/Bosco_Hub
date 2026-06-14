// PATCH /api/bookings/:id/contract  → Vertrags-Status setzen (draft|sent|signed)
// oder den angepassten Vertragstext speichern ({ text }).
import { NextResponse } from "next/server";
import { updateContractStatus, updateContractText } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (typeof body.text === "string") {
      const row = await updateContractText(id, body.text);
      return NextResponse.json({ ok: true, contract: row });
    }
    const row = await updateContractStatus(id, body.status);
    if (!row) return NextResponse.json({ error: "invalid" }, { status: 400 });
    return NextResponse.json({ ok: true, contract: row });
  } catch (err) {
    console.error("PATCH /api/bookings/[id]/contract", err);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
