// components/BookingsView.js — Lista de reservas creadas, agrupadas por casa.
// (Hausmanager) Aquí "aterrizan" las reservas tras darle "Buchung anlegen".
import Link from "next/link";
import { Icon, I } from "@/components/icons";
import { Pill } from "@/components/ui";
import { areaColor } from "@/lib/team";

const STATUS = {
  reserved: { tone: "burgundy", label: "Reserviert" },
  confirmed: { tone: "success", label: "Bestätigt" },
  cancelled: { tone: "error", label: "Storniert" },
};

function groupByHouse(bookings) {
  const map = new Map();
  for (const b of bookings) {
    if (!map.has(b.house)) map.set(b.house, []);
    map.get(b.house).push(b);
  }
  return [...map.entries()].map(([house, items]) => ({ house, items }));
}

export default function BookingsView({ bookings }) {
  const groups = groupByHouse(bookings);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      <div style={{ padding: "20px 26px 14px", maxWidth: 1000, width: "100%", margin: "0 auto" }}>
        <div className="db-kicker" style={{ color: "var(--db-primary)" }}>
          Schritt 2 — Buchungen verwalten
        </div>
        <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2 }}>
          Buchungen · Hausmanager
        </h1>
        <p className="db-muted" style={{ fontSize: 13, margin: "4px 0 0", maxWidth: "62ch" }}>
          Alle angelegten Buchungen, nach Haus gruppiert. Jede entstand aus einer Anfrage im
          Posteingang.
        </p>
      </div>

      <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: "0 26px 26px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {groups.length === 0 && (
            <div className="db-muted" style={{ textAlign: "center", padding: 40 }}>
              Noch keine Buchungen. Lege eine im{" "}
              <Link href="/" style={{ color: "var(--db-primary)", fontWeight: 600 }}>
                Posteingang
              </Link>{" "}
              an.
            </div>
          )}

          {groups.map((g) => (
            <div key={g.house} style={{ marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="route-area-dot" style={{ background: areaColor(g.house), width: 10, height: 10 }} />
                <h2 className="db-h2" style={{ fontSize: 15 }}>{g.house}</h2>
                <span className="db-faint" style={{ fontSize: 12 }}>· {g.items.length} Buchung{g.items.length > 1 ? "en" : ""}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map((b) => {
                  const st = STATUS[b.status] || { tone: "neutral", label: b.status };
                  const card = (
                    <div className="db-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</span>
                          <Pill tone={st.tone} dot={false}>{st.label}</Pill>
                        </div>
                        <div className="db-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                          {b.school && b.school !== b.title ? `${b.school} · ` : ""}
                          {b.program || "Aufenthalt"}
                          {b.contact ? ` · ${b.contact}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{b.dates}</div>
                        <div className="db-faint" style={{ fontSize: 11.5 }}>
                          <Icon d={I.users} size={11} style={{ verticalAlign: -1 }} /> {b.people}
                        </div>
                      </div>
                      {b.inquiryId && (
                        <Icon d={I.chevron} size={16} style={{ color: "var(--db-text-faint)", flexShrink: 0 }} />
                      )}
                    </div>
                  );
                  return b.inquiryId ? (
                    <Link key={b.id} href={`/inquiry/${b.inquiryId}`}>{card}</Link>
                  ) : (
                    <div key={b.id}>{card}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
