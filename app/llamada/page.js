// app/llamada/page.js — Pantalla "Telefon": consola de llamada en vivo (Fase 1).
// Server Component que monta la Shell común y delega lo interactivo a LiveCall.
import Shell from "@/components/Shell";
import PhoneTabs from "@/components/PhoneTabs";
import { getInquiries } from "@/lib/inquiries";
import { getStaff, getCurrentUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function LlamadaPage() {
  const staff = await getStaff();
  const me = await getCurrentUser(staff);
  // Historial: todas las llamadas guardadas (channel='phone'), ya ordenadas por fecha.
  const calls = (await getInquiries()).filter((i) => i.channel === "phone");
  return (
    <Shell staff={staff} me={me} active="live">
      <PhoneTabs calls={calls} />
    </Shell>
  );
}
