// app/llamada/page.js — Pantalla "Telefon": consola de llamada en vivo (Fase 1).
// Server Component que monta la Shell común y delega lo interactivo a LiveCall.
import Shell from "@/components/Shell";
import LiveCall from "@/components/LiveCall";
import { getStaff, getCurrentUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function LlamadaPage() {
  const staff = await getStaff();
  const me = await getCurrentUser(staff);
  return (
    <Shell staff={staff} me={me} active="live">
      <LiveCall />
    </Shell>
  );
}
