// GET /api/inquiries  → lista todas las inquiries que n8n ha extraído.
import { NextResponse } from "next/server";
import { getInquiries } from "@/lib/inquiries";

export const dynamic = "force-dynamic"; // siempre datos frescos de Postgres

export async function GET() {
  try {
    const items = await getInquiries();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/inquiries", err);
    return NextResponse.json(
      { error: "No se pudo leer la base de datos. ¿Está el docker de Postgres arriba?" },
      { status: 500 }
    );
  }
}
