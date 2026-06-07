// GET /api/inquiries  → list all inquiries n8n has extracted.
import { NextResponse } from "next/server";
import { getInquiries } from "@/lib/inquiries";

export const dynamic = "force-dynamic"; // always fresh data from Postgres

export async function GET() {
  try {
    const items = await getInquiries();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/inquiries", err);
    return NextResponse.json(
      { error: "Datenbank nicht erreichbar. Läuft der Postgres-Docker?" },
      { status: 500 }
    );
  }
}
