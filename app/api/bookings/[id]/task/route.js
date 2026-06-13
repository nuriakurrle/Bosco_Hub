// PATCH /api/bookings/:id/task  → eine Vorbereitungs-Aufgabe abhaken/öffnen.
import { NextResponse } from "next/server";
import { setBookingTask } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { id } = await params;
  try {
    const { taskKey, done, by } = await req.json();
    if (!taskKey) return NextResponse.json({ error: "missing taskKey" }, { status: 400 });
    const res = await setBookingTask(id, taskKey, done, by);
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    console.error("PATCH /api/bookings/[id]/task", err);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
