// app/llamada/page.js — Pantalla "Telefon": consola de llamada en vivo (Fase 1).
// Server Component que monta el marco (Header) y delega lo interactivo a LiveCall.
import Header from "@/components/Header";
import LiveCall from "@/components/LiveCall";
import { getStaff, getCurrentUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function LlamadaPage() {
  const staff = await getStaff();
  const me = await getCurrentUser(staff);
  return (
    <div className="db-app" style={{ fontSize: 13 }}>
      <Header staff={staff} me={me} active="live" />
      <LiveCall />
    </div>
  );
}
