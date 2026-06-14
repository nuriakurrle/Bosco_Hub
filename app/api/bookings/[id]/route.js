// PATCH /api/bookings/:id  → Buchungsdetails bearbeiten (Gruppenname,
// Ansprechperson, Programm, Haus, Zeitraum, Personenzahl) aus der Verträge-Section.
import { NextResponse } from "next/server";
import { updateBookingDetails } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { id } = await params;
  try {
    const fields = await req.json();
    const row = await updateBookingDetails(id, fields);
    if (!row) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    return NextResponse.json({ ok: true, booking: row });
  } catch (err) {
    console.error("PATCH /api/bookings/[id]", err);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
