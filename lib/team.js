// lib/team.js — Area helpers (colors, label, suggested person).
// The team is NO longer hardcoded here: it lives in the `staff` table (see lib/staff.js).
// `responsible_area` comes from n8n (Detect Routing node).

// Color per area, based on the text n8n writes in responsible_area.
export function areaColor(area = "") {
  const a = area.toLowerCase();
  if (a.includes("jugendherberge")) return "#6B1E2D";
  if (a.includes("aktionszentrum")) return "#7A8F7A";
  if (a.includes("seminar") || a.includes("web")) return "#3d6b8a";
  return "#9a958c";
}

// Short area label to show in the chip.
export function areaLabel(area = "") {
  const a = area.toLowerCase();
  if (a.includes("jugendherberge")) return "Jugendherberge";
  if (a.includes("aktionszentrum")) return "Aktionszentrum";
  if (a.includes("seminar") || a.includes("web")) return "Seminare & Web";
  return "—";
}

// Suggested person: the team member whose area matches the detected area.
// `staff` is the list coming from the database.
export function suggestedPerson(area = "", staff = []) {
  const a = (area || "").toLowerCase();
  const found = staff.find((s) => {
    const firstWord = (s.area || "").toLowerCase().split(/[\s&]+/)[0];
    return firstWord && a.includes(firstWord);
  });
  return found ? found.key : null;
}
