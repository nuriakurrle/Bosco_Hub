// app/page.js — Startseite: ZUK-Übersicht (Belegungs-Cockpit).
// Server Component: aggregiert die echten Daten und reicht sie an <Dashboard/>.
import Shell from "@/components/Shell";
import Dashboard from "@/components/Dashboard";
import { getDashboard } from "@/lib/dashboard";
import { getStaff, getCurrentUser } from "@/lib/staff";

export const dynamic = "force-dynamic"; // always fresh

export default async function Home() {
  let data = null;
  let staff = [];
  let me = null;
  let error = null;
  try {
    [data, staff] = await Promise.all([getDashboard(), getStaff()]);
    me = await getCurrentUser(staff);
  } catch (err) {
    console.error(err);
    error = err.message;
  }

  return (
    <Shell staff={staff} me={me} active="dashboard">
      {error ? (
        <div className="db-empty">
          <p>
            <b>Keine Verbindung zur Datenbank.</b>
          </p>
          <p className="db-muted" style={{ maxWidth: "46ch" }}>
            Starte den Docker-Stack von n8n, damit Postgres unter Port 5434 erreichbar ist:
          </p>
          <code>cd n8n &amp;&amp; docker compose up -d</code>
        </div>
      ) : (
        <Dashboard data={data} me={me} staff={staff} />
      )}
    </Shell>
  );
}
