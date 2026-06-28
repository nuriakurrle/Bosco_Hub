// app/api/live-call/recording/[id]/route.js
// GET → sirve la grabación de una llamada al reproductor del dashboard.
// Las grabaciones de Twilio son privadas: las descargamos con las credenciales de
// la cuenta (Basic Auth) y las reemitimos como audio/mpeg. Esta ruta está detrás
// del login del dashboard (Caddy), así que solo la abre el staff autenticado.
import { getInquiry } from "@/lib/inquiries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { id } = await params;
  const item = await getInquiry(id);
  const recUrl = item?.recordingUrl;
  if (!recUrl) return new Response("Keine Aufnahme vorhanden.", { status: 404 });

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return new Response("Twilio nicht konfiguriert (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN fehlen).", { status: 503 });
  }

  // Twilio-Aufnahme mit Basic-Auth holen; ".mp3" liefert ein browserfähiges Format.
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const tw = await fetch(`${recUrl}.mp3`, { headers: { Authorization: `Basic ${auth}` } });
  if (!tw.ok || !tw.body) return new Response("Aufnahme nicht verfügbar.", { status: 502 });

  return new Response(tw.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
