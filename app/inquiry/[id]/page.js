// app/inquiry/[id]/page.js — Detail of one inquiry.
// If the inquiry belongs to a conversation with several bookings we show
// SplitDetail; otherwise Detail.
import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import Detail from "@/components/Detail";
import SplitDetail from "@/components/SplitDetail";
import { getInquiry, getConversation } from "@/lib/inquiries";
import { getStaff, getCurrentUser } from "@/lib/staff";
import { getOccupancy, getBookings } from "@/lib/bookings";
import { assessInquiry } from "@/lib/availability";
import { findSimilarBooking } from "@/lib/duplicates";
import { getSchoolHistory } from "@/lib/history";
import { getNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function InquiryPage({ params }) {
  const { id } = await params;
  const item = await getInquiry(id);
  if (!item) notFound();

  const staff = await getStaff();
  const me = await getCurrentUser(staff);

  // Any siblings in the same conversation?
  let siblings = [item];
  if (item.conversationId) {
    siblings = await getConversation(item.conversationId);
  }

  // Belegungs-/Saison-/Datenschutz-Prüfung pro Vorgang (v2). Occupancy kommt aus
  // den echten Buchungen; die Haus-Kapazität ist eine Schätzung (siehe
  // lib/availability.js), solange die Hausmanager-API fehlt.
  const [occupancy, bookings] = await Promise.all([getOccupancy(), getBookings()]);
  const assessments = Object.fromEntries(
    siblings.map((s) => [s.id, assessInquiry(s, occupancy)])
  );
  // Doppel-Anfrage-Erkennung gegen bereits angelegte Buchungen.
  const duplicates = Object.fromEntries(
    siblings
      .map((s) => [s.id, findSimilarBooking(s, bookings)])
      .filter(([, dup]) => dup)
  );

  // Stammkunden-Kontext (nur Einzelvorgang): frühere Buchungen/Anfragen der Schule.
  const history = siblings.length > 1 ? null : await getSchoolHistory(item.school, item.id);
  // Team-Notizen (Vorgang + Schule).
  const notes = await getNotes(item.id, item.school);

  return (
    <Shell staff={staff} me={me} active="inbox">
      {siblings.length > 1 ? (
        <SplitDetail items={siblings} staff={staff} me={me} assessments={assessments} duplicates={duplicates} notes={notes} />
      ) : (
        <Detail item={item} staff={staff} me={me} assessment={assessments[item.id]} duplicate={duplicates[item.id]} history={history} notes={notes} />
      )}
    </Shell>
  );
}
