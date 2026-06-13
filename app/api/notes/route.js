// POST /api/notes — eine Team-Notiz anlegen (interne App-Route, eigenes Postgres,
// keine externe/Hausmanager-API). Analog zu /api/inquiries.
import { NextResponse } from "next/server";
import { addNote } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { inquiryId, schoolName, author, body, pinned } = await req.json();
    if (!body || !body.trim()) {
      return NextResponse.json({ error: "empty note" }, { status: 400 });
    }
    const note = await addNote({ inquiryId, schoolName, author, body: body.trim(), pinned });
    return NextResponse.json({ note });
  } catch (err) {
    console.error("POST /api/notes", err);
    return NextResponse.json({ error: "create failed" }, { status: 500 });
  }
}
