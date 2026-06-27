// app/vertraege/page.js — Verträge & Fristen.
import Shell from "@/components/Shell";
import ContractsView from "@/components/ContractsView";
import { getContractsOverview } from "@/lib/contracts";
import { getStaff, getCurrentUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function VertraegePage({ searchParams }) {
  const sp = await searchParams;
  // Vorfilter aus der Buchungen-Seite (Cross-Link „Entwurf nötig").
  const initialFocus = typeof sp?.focus === "string" ? sp.focus : null;
  let data = { groups: [], kpis: {} };
  let staff = [];
  let me = null;
  let error = null;
  try {
    [data, staff] = await Promise.all([getContractsOverview(), getStaff()]);
    me = await getCurrentUser(staff);
  } catch (err) {
    console.error(err);
    error = err.message;
  }

  return (
    <Shell staff={staff} me={me} active="vertraege">
      {error ? (
        <div className="db-empty">
          <p><b>Keine Verbindung zur Datenbank.</b></p>
          <code>cd n8n && docker compose up -d</code>
        </div>
      ) : (
        <ContractsView data={data} initialFocus={initialFocus} />
      )}
    </Shell>
  );
}
