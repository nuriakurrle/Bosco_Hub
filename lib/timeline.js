// lib/timeline.js — Vorbereitungs-Timeline je Buchung (reine Funktionen, auch
// client-nutzbar; DB-Zugriff liegt in lib/bookings.js). Fristen relativ zum
// Aufenthaltsbeginn — Interview: genaue Zahlen ~2 Monate vorher, Vertrag/Küche
// ~2 Wochen vorher, Detailplanung 1 Woche vorher.
export const TASK_DEFS = [
  { key: "numbers", weeks: 8, label: "Genaue Teilnehmerzahl anfragen" },
  { key: "gender", weeks: 4, label: "Geschlechter-Split (Zimmerzuteilung)" },
  { key: "allergies", weeks: 2, label: "Allergien / Diät an die Küche" },
  { key: "contract", weeks: 2, label: "Vertrag senden" },
  { key: "bus", weeks: 2, label: "Bus / Transport klären" },
  { key: "detail", weeks: 1, label: "Detailplanung (Zimmer, Bettwäsche)" },
];

function fmt(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.`;
}

// startISO = Aufenthaltsbeginn; doneMap = { taskKey: { done } }.
export function computeTimeline(startISO, doneMap = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = startISO ? new Date(startISO) : null;
  if (start) start.setHours(0, 0, 0, 0);
  const past = start && start < today;

  const tasks = TASK_DEFS.map((t) => {
    const done = !!doneMap[t.key]?.done;
    let due = null;
    let tone = "neutral";
    let hint = "";
    if (start) {
      due = new Date(start.getTime() - t.weeks * 7 * 86400000);
      const daysToDue = Math.round((due - today) / 86400000);
      if (done) tone = "success";
      else if (past) tone = "neutral";
      else if (daysToDue < 0) { tone = "error"; hint = "überfällig"; }
      else if (daysToDue <= 7) { tone = "warn"; hint = `in ${daysToDue} T.`; }
      else hint = `in ${daysToDue} T.`;
    } else if (done) tone = "success";
    return { key: t.key, label: t.label, dueLabel: due ? fmt(due) : "—", tone, hint, done };
  });

  const open = tasks.filter((t) => !t.done && !past).length;
  const overdue = tasks.filter((t) => t.tone === "error").length;
  return { tasks, open, overdue, past };
}
