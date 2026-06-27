"use client";
// components/DetailHeader.js — gemeinsame Kopfleiste der Anfrage-Detailseiten
// (Detail & SplitDetail). Zurück-Button + Badges + Titel links, „Zuständig"
// (AssignControl) rechts. Vorher in beiden Dateien dupliziert.
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";
import AssignControl from "@/components/AssignControl";
import { suggestedPerson } from "@/lib/team";

export default function DetailHeader({
  title,
  badges,
  extra = null,
  assignId,
  assignedTo,
  responsibleArea,
  onAssign,
  staff = [],
  me,
  backHref = "/posteingang",
  backLabel = "Posteingang",
}) {
  const router = useRouter();
  return (
    <div className="detail-header">
      <button className="db-btn db-btn-ghost db-btn-sm" onClick={() => router.push(backHref)}>
        <Icon d={I.chevron} size={13} style={{ transform: "rotate(180deg)" }} /> {backLabel}
      </button>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{badges}</div>
        <h1 className="serif" style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 500, color: "var(--db-primary-ink)" }}>
          {title}
        </h1>
      </div>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--db-text-muted)" }}>
          Zuständig:
          <AssignControl
            id={assignId}
            who={assignedTo}
            suggest={suggestedPerson(responsibleArea, staff)}
            onAssign={onAssign}
            compact
            staff={staff}
            me={me}
          />
        </span>
        {extra}
      </span>
    </div>
  );
}
