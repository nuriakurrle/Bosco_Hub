// lib/related.js — Mehrkanal-Erkennung: andere Anfragen derselben Schule
// (oft Telefon + E-Mail), die zum selben Fall gehören könnten.
// Interview (ZUK): "Schule schreibt über verschiedene Kanäle … manuell prüfen,
// ob doppelt." Hier: Vorschlag zum Zusammenführen.
import { parseDateRange } from "@/lib/availability";

function tokens(name = "") {
  return new Set(
    name.toLowerCase()
      .replace(/[äöü]/g, (c) => ({ ä: "a", ö: "o", ü: "u" }[c]))
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}
function tokenSim(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}
function dr(item) {
  return parseDateRange(item.fields?.find((f) => f.key === "date_range")?.value || "");
}

// `item` = aktueller Vorgang, `others` = alle gemappten Inquiries.
export function findRelatedInquiries(item, others = []) {
  const st = tokens(item.school || "");
  if (!st.size) return [];
  const a = dr(item);
  const out = [];
  for (const o of others) {
    if (String(o.id) === String(item.id)) continue;
    // bereits im selben Fall? überspringen
    if (o.conversationId && item.conversationId && o.conversationId === item.conversationId) continue;
    const sim = tokenSim(st, tokens(o.school || ""));
    if (sim < 0.5) continue;
    // Datums-Nähe (überlappend oder < 45 Tage), wenn beide parsebar
    const b = dr(o);
    if (a.parseable && b.parseable) {
      const overlap = a.start <= b.end && b.start <= a.end;
      const near = Math.abs(b.start - a.start) < 45 * 86400000;
      if (!overlap && !near) continue;
    }
    out.push({
      id: String(o.id),
      school: o.school,
      channel: o.channel,
      summary: o.summary,
      received: o.received,
      crossChannel: o.channel !== item.channel,
      score: Math.round(sim * 100),
    });
  }
  // verschiedener Kanal zuerst (stärkstes Signal), dann Score
  return out.sort((x, y) => (y.crossChannel ? 1 : 0) - (x.crossChannel ? 1 : 0) || y.score - x.score).slice(0, 4);
}
