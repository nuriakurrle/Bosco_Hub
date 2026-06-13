// PATCH /api/bookings/:id/contract  → Vertrags-Status setzen (draft|sent|signed).
import { NextResponse } from "next/server";
import { updateContractStatus } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { id } = await params;
  try {
    const { status } = await req.json();
    const row = await updateContractStatus(id, status);
    if (!row) return NextResponse.json({ error: "invalid" }, { status: 400 });
    return NextResponse.json({ ok: true, contract: row });
  } catch (err) {
    console.error("PATCH /api/bookings/[id]/contract", err);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
