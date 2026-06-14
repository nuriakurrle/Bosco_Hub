// app/kalender/page.js — Belegungs-Kalender (Monatsraster über alle Häuser).
// Interview (Vanessa): "ich öffne meinen Zeitplan … von heute bis zum 25. kann
// ich auf einen Blick sehen, welche Gruppen da sind." Genau diese Vorwärts-Sicht.
import Shell from "@/components/Shell";
import CalendarView from "@/components/CalendarView";
import { getBookings, getHouses } from "@/lib/bookings";
import { getStaff, getCurrentUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function KalenderPage() {
  let bookings = [];
  let staff = [];
  let houses = [];
  let me = null;
  let error = null;
  try {
    [bookings, staff, houses] = await Promise.all([getBookings(), getStaff(), getHouses()]);
    me = await getCurrentUser(staff);
  } catch (err) {
    console.error(err);
    error = err.message;
  }

  return (
    <Shell staff={staff} me={me} active="kalender">
      {error ? (
        <div className="db-empty">
          <p><b>Keine Verbindung zur Datenbank.</b></p>
          <code>cd n8n && docker compose up -d</code>
        </div>
      ) : (
        <CalendarView bookings={bookings} houses={houses} staff={staff} />
      )}
    </Shell>
  );
}
