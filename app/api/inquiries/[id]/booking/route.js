// POST /api/inquiries/:id/booking → creates a real booking in `bookings`
// from the inquiry, and marks the inquiry as 'booking_created'.
import { NextResponse } from "next/server";
import { createBookingFromInquiry } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const { id } = await params;
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      /* no body is fine */
    }
    const result = await createBookingFromInquiry(id, body.created_by);
    if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/inquiries/[id]/booking", err);
    return NextResponse.json({ error: "booking failed" }, { status: 500 });
  }
}
