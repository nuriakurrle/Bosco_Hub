"use client";
// AssignControl — pastilla para asignar una inquiry a una persona del equipo.
// Presentacional: el equipo (`staff`) y el usuario actual (`me`) llegan por props
// desde el servidor; el guardado lo hace el padre vía onAssign.
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
