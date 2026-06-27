"use client";
// components/BookingEditModal.js — gemeinsames Bearbeiten-Formular (Modal) für
// eine Buchung. Genutzt von der Buchungen- und der Verträge-Section.
import { Icon, I } from "@/components/icons";

export default function BookingEditModal({ editing, houses = [], onField, onCancel, onSave }) {
  if (!editing) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <Icon d={I.pencil} size={15} />
          <b>Buchung bearbeiten</b>
          <button className="modal-x" onClick={onCancel}><Icon d={I.x} size={14} /></button>
        </div>
        <div className="cform">
          <label className="full">Gruppe / Bezeichnung
            <input value={editing.groupLabel} onChange={(e) => onField("groupLabel", e.target.value)} placeholder={editing.school || "Buchung"} />
          </label>
          <label>Ansprechperson
            <input value={editing.contact} onChange={(e) => onField("contact", e.target.value)} />
          </label>
          <label>Programm / Format
            <input value={editing.program} onChange={(e) => onField("program", e.target.value)} />
          </label>
          <label>Haus
            <select value={editing.houseId} onChange={(e) => onField("houseId", e.target.value)}>
              <option value="">Ohne Haus</option>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          <label>Teilnehmende
            <input type="number" min="0" value={editing.peopleNum} onChange={(e) => onField("peopleNum", e.target.value)} />
          </label>
          <label>Anreise
            <input type="date" value={editing.startDate} onChange={(e) => onField("startDate", e.target.value)} />
          </label>
          <label>Abreise
            <input type="date" value={editing.endDate} onChange={(e) => onField("endDate", e.target.value)} />
          </label>
          <label className="full">Zeitraum als Freitext (wenn kein konkretes Datum)
            <input value={editing.dateRangeText} onChange={(e) => onField("dateRangeText", e.target.value)} placeholder="z. B. Mitte Oktober" />
          </label>
        </div>
        <div className="modal-foot">
          <span className="db-faint" style={{ fontSize: 12, marginRight: "auto" }}>
            Anreise/Abreise haben Vorrang vor dem Freitext.
          </span>
          <button className="db-btn db-btn-ghost db-btn-sm" onClick={onCancel}>abbrechen</button>
          <button className="db-btn db-btn-primary db-btn-sm" onClick={onSave}><Icon d={I.check} size={12} /> speichern</button>
        </div>
      </div>
    </div>
  );
}
