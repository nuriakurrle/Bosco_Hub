// app/buchungen/page.js — "Buchungen / Hausmanager" view.
// Server Component: reads the bookings from Postgres and shows them grouped by house.
import Shell from "@/components/Shell";
import BookingsView from "@/components/BookingsView";
import { getBookings } from "@/lib/bookings";
import { getStaff, getCurrentUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function BuchungenPage() {
  let bookings = [];
  let staff = [];
  let me = null;
  let error = null;
  try {
    [bookings, staff] = await Promise.all([getBookings(), getStaff()]);
    me = await getCurrentUser(staff);
  } catch (err) {
    console.error(err);
    error = err.message;
  }

  return (
    <Shell staff={staff} me={me} active="buchungen">
      {error ? (
        <div className="db-empty">
          <p>
            <b>Keine Verbindung zur Datenbank.</b>
          </p>
          <code>cd n8n && docker compose up -d</code>
        </div>
      ) : (
        <BookingsView bookings={bookings} />
      )}
    </Shell>
  );
}
