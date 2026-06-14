"use client";
import { useState } from "react";

// Gemeinsame Bearbeiten-Logik für Buchungen (Buchungen- & Verträge-Section):
// hält die optimistische Liste, den Formular-Entwurf und das Speichern (Details
// + angepasster Vertragstext). `derive` rechnet die Anzeige-Felder aus den
// Rohwerten neu — je Ansicht unterschiedlich (Fristen/Tage/Sortier-Zeitstempel).
export function useBookingEdit(initialItems, derive) {
  const [items, setItems] = useState(initialItems);
  // Buchung, die gerade bearbeitet wird (Formular-Entwurf) oder null.
  const [editing, setEditing] = useState(null);

  const setField = (key, val) => setEditing((e) => ({ ...e, [key]: val }));

  // Buchungsdetails speichern (optimistisch) und Anzeige live neu ableiten.
  async function saveDetails() {
    const f = editing;
    const patch = {
      groupLabel: f.groupLabel, contact: f.contact, program: f.program,
      houseId: f.houseId, peopleNum: f.peopleNum,
      startDate: f.startDate, endDate: f.endDate, dateRangeText: f.dateRangeText,
    };
    setItems((list) => list.map((it) => (it.id === f.id ? derive({ ...it, ...patch }) : it)));
    setEditing(null);
    try {
      await fetch(`/api/bookings/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      /* optimistisch belassen */
    }
  }

  // Angepassten Vertragstext speichern.
  async function saveText(id, text) {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, contractText: text } : it)));
    await fetch(`/api/bookings/${id}/contract`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  }

  return { items, setItems, editing, setEditing, setField, saveDetails, saveText };
}
