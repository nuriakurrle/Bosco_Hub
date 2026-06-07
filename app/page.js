// app/page.js — Página principal: el Team-Posteingang.
// Server Component: lee Postgres (inquiries + equipo) y pasa todo a los
// componentes cliente.
import Header from "@/components/Header";
import Inbox from "@/components/Inbox";
import { getInquiries } from "@/lib/inquiries";
import { getStaff, getCurrentUser } from "@/lib/staff";

export const dynamic = "force-dynamic"; // siempre fresco

export default async function Home() {
  let items = [];
  let staff = [];
  let me = null;
  let error = null;
  try {
    [items, staff] = await Promise.all([getInquiries(), getStaff()]);
    me = await getCurrentUser(staff);
  } catch (err) {
    console.error(err);
    error = err.message;
  }

  return (
    <div className="db-app" style={{ fontSize: 13 }}>
      <Header staff={staff} me={me} active="inbox" />
      {error ? (
        <div className="db-empty">
          <p>
            <b>Keine Verbindung zur Datenbank.</b>
          </p>
          <p className="db-muted" style={{ maxWidth: "46ch" }}>
            Starte den Docker-Stack von n8n, damit Postgres unter Port 5434 erreichbar ist:
          </p>
          <code>cd n8n && docker compose up -d</code>
        </div>
      ) : (
        <Inbox items={items} staff={staff} me={me} />
      )}
    </div>
  );
}
