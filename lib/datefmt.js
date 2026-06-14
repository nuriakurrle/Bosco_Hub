// lib/datefmt.js — gemeinsame Datums-Helfer (client- und serverseitig nutzbar).

// "yyyy-mm-dd" → "dd.mm.yyyy" für die Anzeige (null, wenn leer).
export function fmtDE(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split("-");
  return `${d}.${m}.${y}`;
}

// beliebiges Datum → "yyyy-mm-dd" für <input type="date"> (leer, wenn kein Datum).
export function isoDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
