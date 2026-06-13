// lib/notes.js — Team-Notizen (Übergabe pro Vorgang + Wissensspeicher pro Schule).
// Eine Notiz erscheint auf ihrem Vorgang UND auf anderen Vorgängen derselben
// Schule, damit bekanntes Wissen ("reine Mädchenklasse") wieder auftaucht.
import { query } from "@/lib/db";

function relTime(date) {
  if (!date) return "";
  const min = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? "gestern" : `vor ${d} Tagen`;
}

function mapNote(r, currentInquiryId) {
  return {
    id: String(r.id),
    body: r.body,
    pinned: r.pinned,
    author: r.author,
    authorName: r.author_name || r.author || "—",
    authorShort: r.author_short || (r.author ? r.author.slice(0, 2).toUpperCase() : "?"),
    time: relTime(r.created_at),
    // Stammt die Notiz aus einem anderen Vorgang derselben Schule?
    fromOtherCase: r.inquiry_id != null && String(r.inquiry_id) !== String(currentInquiryId),
  };
}

// Notizen für einen Vorgang: eigene + die der gleichen Schule.
export async function getNotes(inquiryId, schoolName) {
  const needle = schoolName && !schoolName.startsWith("—")
    ? `%${schoolName.split(/\s+/).slice(0, 2).join(" ")}%`
    : null;
  const rows = await query(
    `SELECT n.*, s.name AS author_name, s.short AS author_short
       FROM notes n
       LEFT JOIN staff s ON s.key = n.author
      WHERE n.inquiry_id = $1 OR ($2::text IS NOT NULL AND n.school_name ILIKE $2)
      ORDER BY n.pinned DESC, n.created_at DESC`,
    [inquiryId ? Number(inquiryId) : null, needle]
  );
  return rows.map((r) => mapNote(r, inquiryId));
}

export async function addNote({ inquiryId, schoolName, author, body, pinned = false }) {
  const rows = await query(
    `INSERT INTO notes (inquiry_id, school_name, author, body, pinned)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [inquiryId ? Number(inquiryId) : null, schoolName || null, author || null, body, !!pinned]
  );
  // Autorname für die sofortige Anzeige nachladen.
  const r = rows[0];
  if (r?.author) {
    const s = await query(`SELECT name, short FROM staff WHERE key = $1`, [r.author]);
    r.author_name = s[0]?.name;
    r.author_short = s[0]?.short;
  }
  return mapNote(r, inquiryId);
}
