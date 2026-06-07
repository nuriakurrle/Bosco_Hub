// lib/team.js — Helpers de área (colores, etiqueta, persona sugerida).
// El equipo ya NO está aquí hardcodeado: vive en la tabla `staff` (ver lib/staff.js).
// `responsible_area` viene de n8n (nodo Detect Routing).

// Color por área, según el texto que escribe n8n en responsible_area.
export function areaColor(area = "") {
  const a = area.toLowerCase();
  if (a.includes("jugendherberge")) return "#6B1E2D";
  if (a.includes("aktionszentrum")) return "#7A8F7A";
  if (a.includes("seminar") || a.includes("web")) return "#3d6b8a";
  return "#9a958c";
}

// Etiqueta corta del área para mostrar en el chip.
export function areaLabel(area = "") {
  const a = area.toLowerCase();
  if (a.includes("jugendherberge")) return "Jugendherberge";
  if (a.includes("aktionszentrum")) return "Aktionszentrum";
  if (a.includes("seminar") || a.includes("web")) return "Seminare & Web";
  return "—";
}

// Persona sugerida: la del equipo cuya área coincide con el área detectada.
// `staff` es la lista que viene de la base de datos.
export function suggestedPerson(area = "", staff = []) {
  const a = (area || "").toLowerCase();
  const found = staff.find((s) => {
    const firstWord = (s.area || "").toLowerCase().split(/[\s&]+/)[0];
    return firstWord && a.includes(firstWord);
  });
  return found ? found.key : null;
}
