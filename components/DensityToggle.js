"use client";
// components/DensityToggle.js — schaltet zwischen komfortabler und kompakter
// Darstellung (mehr Zeilen sichtbar). Merkt sich die Wahl in localStorage und
// setzt die Klasse `compact` auf <html>.
import { useEffect, useState } from "react";
import { Icon, I } from "@/components/icons";

export default function DensityToggle() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem("db_density") === "compact";
    setCompact(v);
    document.documentElement.classList.toggle("compact", v);
  }, []);

  function toggle() {
    const v = !compact;
    setCompact(v);
    localStorage.setItem("db_density", v ? "compact" : "comfortable");
    document.documentElement.classList.toggle("compact", v);
  }

  return (
    <button className="db-chip" onClick={toggle} title="Anzeigedichte umschalten">
      <Icon d={I.more} size={14} />
      {compact ? "Kompakt" : "Komfort"}
    </button>
  );
}
