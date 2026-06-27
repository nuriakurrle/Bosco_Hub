// lib/team.js — Area helpers (colors, label, suggested person).
// The team is NO longer hardcoded here: it lives in the `staff` table (see lib/staff.js).
// `responsible_area` comes from n8n (Detect Routing node).

// Color per area, based on the text n8n writes in responsible_area.
// Returns CSS-variable references (defined once in globals.css :root) so house
// colors stay distinct from the brand (Burgund) and the semantic palette.
// Jugendherberge is intentionally NO longer Maroon — it now uses its own Teal.
export function areaColor(area = "") {
  const a = area.toLowerCase();
  if (a.includes("bildungszentrum") || a.includes("jugendherberge")) return "var(--db-house-jh)";
  if (a.includes("gästehaus") || a.includes("gaestehaus") || a.includes("gästezentrum") || a.includes("gaestezentrum") || a.includes("aktionszentrum")) return "var(--db-house-az)";
  if (a.includes("zeltplatz") || a.includes("zelt")) return "var(--db-house-zp)";
  if (a.includes("seminar") || a.includes("web")) return "var(--db-house-sem)";
  return "var(--db-text-faint)";
}

// Short area label to show in the chip.
export function areaLabel(area = "") {
  const a = area.toLowerCase();
  if (a.includes("bildungszentrum") || a.includes("jugendherberge")) return "Bildungszentrum";
  if (a.includes("gästehaus") || a.includes("gaestehaus") || a.includes("gästezentrum") || a.includes("gaestezentrum") || a.includes("aktionszentrum")) return "Gästehaus";
  if (a.includes("zeltplatz") || a.includes("zelt")) return "Zeltplatz";
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
