// GET /api/schools/summary?name=…
// Devuelve un resumen del cliente (escuela) redactado con IA: { summary }.
// On-demand (lo dispara un botón); no se cachea aún.
import { NextResponse } from "next/server";
import { summarizeSchool } from "@/lib/aiSummary";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name fehlt" }, { status: 400 });
  try {
    const out = await summarizeSchool(name);
    return NextResponse.json(out || { summary: "" });
  } catch (err) {
    console.error("GET /api/schools/summary", err);
    return NextResponse.json(
      { error: "KI-Zusammenfassung fehlgeschlagen. Ist OPENAI_API_KEY gesetzt?" },
      { status: 500 }
    );
  }
}
