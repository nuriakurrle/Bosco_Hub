"use client";
// components/MealPlan.js — Küchenplan als strukturierte Tabelle (Tage × Mahlzeiten)
// statt Freitext. Allergien/Diät als reine Zahlen (DSGVO). Kopieren + Drucken.
import { useState } from "react";
import { Icon, I } from "@/components/icons";
import { computeMealPlan, buildMealPlan, MEAL_COLS } from "@/lib/mealplan";

const ROW_TONE = { Anreise: "var(--db-info)", Abreise: "var(--db-primary)", Volltag: "var(--db-line)", Tag: "var(--db-info)" };

export function MealButton({ booking }) {
  const [open, setOpen] = useState(false);
  const [diet, setDiet] = useState({ veg: "", vegan: "", allergien: "", sonstiges: "" });
  const [copied, setCopied] = useState(false);

  const plan = open ? computeMealPlan(booking) : null;

  function setD(k, v) {
    setDiet((d) => ({ ...d, [k]: v.replace(/[^\d]/g, "") }));
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(buildMealPlan(booking, diet));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  function print() {
    const w = window.open("", "_blank");
    if (!w) return;
    const cell = (v) => (v ? v : "·");
    const rows = plan.rows
      .map(
        (r) =>
          `<tr><td>${r.label}${r.date ? ` <span class="d">${r.date}</span>` : ""}</td>` +
          MEAL_COLS.map((c) => `<td class="num">${cell(r[c.key])}</td>`).join("") +
          `</tr>`
      )
      .join("");
    const totals = MEAL_COLS.map((c) => `<td class="num"><b>${plan.totals[c.key]}</b></td>`).join("");
    w.document.write(`
      <style>
        body{font:13px/1.5 ui-sans-serif,system-ui,sans-serif;padding:32px;color:#241a16}
        h1{font-size:18px;margin:0 0 2px} .sub{color:#6b6259;margin:0 0 16px}
        table{border-collapse:collapse;width:100%;margin-bottom:18px}
        th,td{border:1px solid #ddd;padding:6px 9px;text-align:left}
        th{background:#f3efe7;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
        .num{text-align:right;font-variant-numeric:tabular-nums} .d{color:#8a8178;font-weight:400}
        .diet td{border:none;padding:3px 0}
      </style>
      <h1>Küchenplan — ${booking.title || booking.school || "Gruppe"}</h1>
      <p class="sub">${booking.house || ""} · ${booking.dates} · ${plan.n} Personen</p>
      <table><thead><tr><th>Tag</th>${MEAL_COLS.map((c) => `<th class="num">${c.label}</th>`).join("")}</tr></thead>
      <tbody>${rows}<tr><td><b>Summe</b></td>${totals}</tr></tbody></table>
      <table class="diet"><tr><td>Vegetarisch: <b>${diet.veg || "—"}</b></td><td>Vegan: <b>${diet.vegan || "—"}</b></td>
      <td>Allergien: <b>${diet.allergien || "—"}</b></td><td>Sonstiges: <b>${diet.sonstiges || "—"}</b></td></tr></table>
      <p class="sub">Endgültige Zahlen bis 2 Wochen vor Anreise an die Küche.</p>
    `);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <>
      <button className="db-btn db-btn-ghost db-btn-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} title="Küchenplan">
        <Icon d={I.meal} size={12} /> Küche
      </button>

      {open && plan && (
        <div className="modal-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-head">
              <Icon d={I.meal} size={15} />
              <b>Küchenplan · {booking.title || booking.school}</b>
              <button className="modal-x" onClick={() => setOpen(false)}><Icon d={I.x} size={14} /></button>
            </div>

            <div style={{ padding: 16, overflow: "auto" }}>
              <div className="db-muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
                {booking.house} · {booking.dates} · <b>{plan.n} Personen</b> · {plan.days} Tage
                <span className="db-faint"> — Anreise mittags, Abreise mit Lunchpaket angenommen.</span>
              </div>

              <table className="meal-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    {MEAL_COLS.map((c) => <th key={c.key} className="num">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <span className="meal-daydot" style={{ background: ROW_TONE[r.label] || "var(--db-line)" }} />
                        {r.label}{r.date ? <span className="db-faint" style={{ marginLeft: 5 }}>{r.date}</span> : ""}
                      </td>
                      {MEAL_COLS.map((c) => (
                        <td key={c.key} className={`num${r[c.key] ? "" : " zero"}`}>{r[c.key] || "·"}</td>
                      ))}
                    </tr>
                  ))}
                  <tr className="meal-total">
                    <td>Summe</td>
                    {MEAL_COLS.map((c) => <td key={c.key} className="num">{plan.totals[c.key]}</td>)}
                  </tr>
                </tbody>
              </table>

              <div className="meal-diet">
                <div className="meal-diet-head">Diät / Allergien <span className="db-faint">— nur Zahlen, keine Namen (DSGVO)</span></div>
                <div className="meal-diet-grid">
                  {[["veg", "Vegetarisch"], ["vegan", "Vegan"], ["allergien", "Allergien"], ["sonstiges", "Sonstiges"]].map(([k, label]) => (
                    <label key={k}>
                      {label}
                      <input inputMode="numeric" value={diet[k]} onChange={(e) => setD(k, e.target.value)} placeholder="—" />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <span className="db-faint" style={{ fontSize: 11.5, marginRight: "auto" }}>
                Endgültige Zahlen bis 2 Wochen vor Anreise an die Küche.
              </span>
              <button className="db-btn db-btn-ghost db-btn-sm" onClick={copy}>{copied ? "kopiert ✓" : "kopieren"}</button>
              <button className="db-btn db-btn-primary db-btn-sm" onClick={print}><Icon d={I.doc} size={12} /> Drucken / PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
