// lib/availability.js — Belegungs-, Saison- und Ressourcenprüfung (v2).
// ────────────────────────────────────────────────────────────────────────────
// This is the "Platz prüfen" step the Detail/SplitDetail screens promised for v2.
// Until the Hausmanager API exists, the *capacity* of each house is a clearly
// labelled estimate (see HOUSES below); the *occupancy* on the requested dates is
// computed from the REAL `bookings` table. The rules encoded here come straight
// from the staff interviews (Niklas, ZUK/Vanessa):
//   • Orientierungstage laufen in der Jugendherberge nur Okt–Mai.
//   • Sommerprogramm/Umweltwochen laufen Mai–Okt.
//   • Parallel-Limit ≈ 5 Referent:innen / 5 Bildungsräume (Gruppen 20–30).
//   • Geschlechter-Aufteilung ist für die Zimmerzuteilung (Stockwerk-/Gang-
//     Trennung wegen geteilter Bäder) zwingend nötig.
//   • Gesundheitsdaten mit Klarnamen = DSGVO Art. 9 — nur direkt beteiligtes
//     Personal.

// ── Haus-Kapazitäten — SCHÄTZWERTE, bis die Hausmanager-API angebunden ist ────
const HOUSES = {
  jugendherberge: { beds: 150, seminarRooms: 4, referentSlots: 5 },
  aktionszentrum: { beds: 90, seminarRooms: 5, referentSlots: 5 },
};
// Auch für das Dashboard (Auslastung je Haus) nutzbar.
export const HOUSE_CAPACITY = HOUSES;
// "eng" ab 85 % Bettenauslastung; darunter "frei".
const TIGHT_RATIO = 0.85;

function houseKey(houseName = "") {
  const h = houseName.toLowerCase();
  if (h.includes("jugendherberge")) return "jugendherberge";
  if (h.includes("aktionszentrum")) return "aktionszentrum";
  return null;
}

// ── Saison-Regeln ────────────────────────────────────────────────────────────
// Monate als 1–12. Ein Programm "verletzt" die Saison, wenn der Start-Monat
// außerhalb des Fensters liegt.
const SEASON = {
  orientierung: { months: [10, 11, 12, 1, 2, 3, 4, 5], label: "Orientierungstage (Okt–Mai)" },
  sommer: { months: [5, 6, 7, 8, 9, 10], label: "Sommerprogramm (Mai–Okt)" },
};

function seasonRuleFor(programType = "") {
  const p = programType.toLowerCase();
  if (p.includes("orientierung") || p.includes("besinnung")) return SEASON.orientierung;
  if (p.includes("umwelt") || p.includes("sommer")) return SEASON.sommer;
  return null; // Schullandheim u.a. laufen ganzjährig in einer der Varianten.
}

// ── Parser ───────────────────────────────────────────────────────────────────
const MONTHS_DE = {
  januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
};

function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmt(d) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// Versucht aus dem freien Text einen Zeitraum zu lesen.
// Erkennt: "15.02.2026–17.02.2026", "03.06.2026", "15.–17. Februar 2026".
export function parseDateRange(text = "") {
  if (!text) return { parseable: false };
  const full = [...text.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)];
  if (full.length) {
    const mk = (m) => new Date(+m[3], +m[2] - 1, +m[1]);
    const start = mk(full[0]);
    const end = full[1] ? mk(full[1]) : start;
    return { parseable: true, start, end };
  }
  // "15.–17. Februar 2026"
  const named = text
    .toLowerCase()
    .match(/(\d{1,2})\.?\s*[–-]\s*(\d{1,2})\.?\s*([a-zäöü]+)\s*(\d{4})/);
  if (named) {
    const mon = MONTHS_DE[named[3]];
    if (mon) {
      const year = +named[4];
      return {
        parseable: true,
        start: new Date(year, mon - 1, +named[1]),
        end: new Date(year, mon - 1, +named[2]),
      };
    }
  }
  return { parseable: false };
}

// Erste Zahl im Text ("27 + 2" → 27, "ca. 60 (2 Klassen)" → 60).
export function parsePeople(text = "") {
  const m = String(text).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Geschlechter-Aufteilung erkennen ("14 w / 10 m", "18 männlich", "Mädchenschule").
export function parseGender(text = "") {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return { known: false };
  const wm = t.match(/(\d+)\s*w[^a-z]?.{0,6}?(\d+)\s*m\b/) || t.match(/(\d+)\s*m[^a-z]?.{0,6}?(\d+)\s*w\b/);
  if (wm) return { known: true, value: text.match(/\d+\s*[wm].*\d+\s*[wm]/i)?.[0] || "geteilt" };
  if (/(mädchen|jungen|burschen)schule/.test(t)) return { known: true, value: "reine Klasse" };
  if (/(männlich|weiblich|jungen|mädchen)/.test(t)) return { known: true, value: "Hinweis vorhanden" };
  return { known: false };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

// ── Kern: ein Vorgang bewerten ───────────────────────────────────────────────
// `item` = das gemappte Inquiry-Objekt (siehe lib/inquiries.js rowToItem).
// `occupancy` = Liste realer Buchungen [{ house, start, end, people }].
export function assessInquiry(item, occupancy = []) {
  const hKey = houseKey(item.house);
  const cap = hKey ? HOUSES[hKey] : null;
  const dr = parseDateRange(item.fields.find((f) => f.key === "date_range")?.value || "");
  const people = parsePeople(item.fields.find((f) => f.key === "number_of_people")?.value || "");
  const programType = item.fields.find((f) => f.key === "program_type")?.value || "";
  const special = item.fields.find((f) => f.key === "special_requirements")?.value || "";

  const reasons = [];
  let verdict = "unklar";
  let capacity = null;
  let alternatives = [];

  // Saison-Check (unabhängig von konkreten Tagen, sobald ein Monat bekannt ist).
  const rule = seasonRuleFor(programType);
  let season = { ok: true, rule: null, message: null };
  if (rule && dr.parseable) {
    const m = dr.start.getMonth() + 1;
    if (!rule.months.includes(m)) {
      season = {
        ok: false,
        rule: rule.label,
        message: `${programType || "Dieses Format"} läuft nur in der Saison „${rule.label}". Der angefragte Termin liegt außerhalb.`,
      };
      verdict = "konflikt";
      reasons.push(`Saison-Konflikt: ${rule.label}`);
      alternatives = suggestInSeason(dr, rule);
    }
  }

  // Belegungs-Check (nur sinnvoll mit Haus + parsebaren Tagen).
  if (cap && dr.parseable) {
    const sameHouse = occupancy.filter((b) => houseKey(b.house) === hKey && b.start && b.end);
    const concurrent = sameHouse.filter((b) => overlaps(dr.start, dr.end, b.start, b.end));
    const bedsUsed = concurrent.reduce((s, b) => s + (b.people || 0), 0);
    const parallelPrograms = concurrent.length;
    const need = people || 0;
    const bedsFreeAfter = cap.beds - bedsUsed - need;

    capacity = {
      beds: cap.beds,
      bedsUsed,
      need,
      bedsFreeAfter,
      bedsRatio: Math.min(1, (bedsUsed + need) / cap.beds),
      referentSlots: cap.referentSlots,
      parallelPrograms,
    };

    if (season.ok) {
      if (bedsFreeAfter < 0) {
        verdict = "voll";
        reasons.push(`Betten: ${bedsUsed + need}/${cap.beds} belegt — keine Reserve.`);
        alternatives = suggestShift(dr);
      } else if (parallelPrograms >= cap.referentSlots) {
        verdict = "voll";
        reasons.push(`${parallelPrograms} parallele Programme — Referent:innen-Limit (${cap.referentSlots}) erreicht.`);
        alternatives = suggestShift(dr);
      } else if (capacity.bedsRatio >= TIGHT_RATIO || parallelPrograms >= cap.referentSlots - 1) {
        verdict = "eng";
        reasons.push(
          capacity.bedsRatio >= TIGHT_RATIO
            ? `Betten knapp: ${bedsUsed + need}/${cap.beds}.`
            : `${parallelPrograms}/${cap.referentSlots} Referent:innen-Slots belegt.`
        );
      } else {
        verdict = "frei";
        reasons.push(`${bedsFreeAfter} Betten frei nach dieser Gruppe.`);
      }
    }
  } else if (verdict === "unklar") {
    reasons.push(
      !cap ? "Haus unklar — bitte zuerst Haus festlegen." : "Zeitraum nicht eindeutig — bitte konkrete Tage ergänzen."
    );
  }

  // ── Zimmer- & Datenschutz-Gate ──────────────────────────────────────────────
  const gender = parseGender([special, item.fields.find((f) => f.key === "grade_level")?.value].filter(Boolean).join(" "));
  const referentsNeeded = people ? Math.max(2, Math.ceil(people / 30)) : 2;
  const safety = {
    gender,
    dataProtection: {
      sensitive: !!item.containsSensitiveData,
      note: item.sensitiveDataNote || "",
    },
    resource: {
      referentsNeeded,
      referentsAvailable: cap ? cap.referentSlots : null,
      ok: cap ? referentsNeeded <= cap.referentSlots : null,
    },
    // "Gate offen" = mind. ein Punkt braucht eine bewusste Entscheidung.
    open: !gender.known || !!item.containsSensitiveData,
  };

  return {
    availability: { dates: dr.parseable ? { start: fmt(dr.start), end: fmt(dr.end) } : null, parseable: dr.parseable, people, verdict, reasons, season, capacity, alternatives, house: item.house || null },
    safety,
  };
}

// ── Alternativen ─────────────────────────────────────────────────────────────
function durationDays(dr) {
  return Math.max(0, Math.round((dr.end - dr.start) / 86400000));
}

// Saison-Konflikt: gleiche Dauer in die zwei zeitlich nächsten In-Saison-Termine
// schieben (bevorzugt in der Zukunft relativ zum angefragten Termin).
function suggestInSeason(dr, rule) {
  const dur = durationDays(dr);
  const day = Math.min(dr.start.getDate(), 24);
  const year = dr.start.getFullYear();
  // Kandidaten in diesem und im nächsten Jahr bilden …
  const candidates = [];
  for (const y of [year, year + 1]) {
    for (const m of rule.months) candidates.push(new Date(y, m - 1, day));
  }
  // … nur künftige, nach Nähe zum Wunschtermin sortiert, die ersten zwei.
  return candidates
    .filter((d) => d >= dr.start)
    .sort((a, b) => a - b)
    .slice(0, 2)
    .map((start) => ({
      label: `${fmt(start)} – ${fmt(new Date(start.getTime() + dur * 86400000))}`,
      note: "in Saison · Belegung frei (geschätzt)",
    }));
}

// Voll/eng: eine Woche früher / später vorschlagen.
function suggestShift(dr) {
  const dur = durationDays(dr);
  const mk = (offsetDays) => {
    const s = new Date(dr.start.getTime() + offsetDays * 86400000);
    const e = new Date(s.getTime() + dur * 86400000);
    return { label: `${fmt(s)} – ${fmt(e)}`, note: offsetDays < 0 ? "eine Woche früher" : "eine Woche später" };
  };
  return [mk(-7), mk(7)];
}
