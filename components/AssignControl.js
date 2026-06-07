"use client";
// AssignControl — pill to assign an inquiry to a team member.
// Presentational: the team (`staff`) and current user (`me`) arrive via props
// from the server; the parent persists via onAssign.
import { Icon, I } from "@/components/icons";

export default function AssignControl({ id, who, suggest, onAssign, compact, staff = [], me }) {
  const byKey = (k) => staff.find((s) => s.key === k);

  const assignee = who && byKey(who);
  if (assignee) {
    return (
      <span
        className="assignee"
        title={`${assignee.name} · ${assignee.area} — Klicken zum Aufheben`}
        onClick={() => onAssign(id, null)}
      >
        <span className="assignee-av" style={{ background: "#d9b89a" }}>
          {assignee.short}
        </span>
        {assignee.name.split(" ")[0]}
        {who === me ? " · Sie" : ""}
      </span>
    );
  }

  const suggested = byKey(suggest);
  const target = suggest || me;
  return (
    <span
      className="assignee unassigned"
      title={suggested ? `Vorschlag: ${suggested.name}` : "Mir zuweisen"}
      onClick={() => onAssign(id, target)}
    >
      <Icon d={I.users} size={12} />
      {suggested ? `${suggested.name.split(" ")[0]}?` : "Zuweisen"}
      {!compact && " →"}
    </span>
  );
}
