// GET   /api/inquiries/:id  → one inquiry
// PATCH /api/inquiries/:id  → update (assignment, status, or edited fields)
import { NextResponse } from "next/server";
import { getInquiry, updateInquiry } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const { id } = await params;
  const item = await getInquiry(id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  try {
    const patch = await req.json();
    const item = await updateInquiry(id, patch);
    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("PATCH /api/inquiries/[id]", err);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
