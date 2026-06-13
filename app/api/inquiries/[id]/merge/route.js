// POST /api/inquiries/:id/merge  → Vorgang mit einem anderen zusammenführen
// (gemeinsame conversation_id). Body: { targetId }.
import { NextResponse } from "next/server";
import { mergeInquiries } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const { id } = await params;
  try {
    const { targetId } = await req.json();
    if (!targetId) return NextResponse.json({ error: "missing targetId" }, { status: 400 });
    const res = await mergeInquiries(id, targetId);
    if (!res) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    console.error("POST /api/inquiries/[id]/merge", err);
    return NextResponse.json({ error: "merge failed" }, { status: 500 });
  }
}
