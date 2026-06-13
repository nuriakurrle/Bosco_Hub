// components/SchoolHistory.js — Stammkunden-/Schul-Kontext.
// Zeigt, ob die Schule bekannt ist und welche früheren Buchungen es gibt, damit
// das Team nicht erneut nach Bekanntem fragen muss.
import Link from "next/link";
import { Icon, I } from "@/components/icons";
import { Pill } from "@/components/ui";

const ST = {
  reserved: { label: "reserviert", tone: "info" },
  confirmed: { label: "bestätigt", tone: "success" },
  cancelled: { label: "storniert", tone: "neutral" },
};

export default function SchoolHistory({ history }) {
  if (!history) return null;
  return (
    <div className="school-history">
      <div className="sh-head">
        <Icon d={I.users} size={14} />
        <b style={{ fontSize: 12.5 }}>Stammkunde</b>
        <span className="db-muted" style={{ fontSize: 11.5 }}>
          {history.bookingsCount > 0
            ? `${history.bookingsCount} frühere Buchung${history.bookingsCount > 1 ? "en" : ""}`
            : `${history.priorInquiries} frühere Anfrage${history.priorInquiries > 1 ? "n" : ""}`}
        </span>
      </div>
      {history.bookings.length > 0 && (
        <div className="sh-list">
          {history.bookings.map((b) => {
            const st = ST[b.status] || { label: b.status, tone: "neutral" };
            return (
              <Link key={b.id} href={`/buchungen#booking-${b.id}`} className="sh-row">
                <span className="mono sh-dates">{b.dates}</span>
                <span className="sh-prog">{b.program}</span>
                <span className="sh-people mono">{b.people}</span>
                <Pill tone={st.tone} dot={false}>{st.label}</Pill>
              </Link>
            );
          })}
        </div>
      )}
      <div className="sh-hint db-muted">Bekannte Angaben lassen sich übernehmen, statt erneut zu fragen.</div>
    </div>
  );
}
