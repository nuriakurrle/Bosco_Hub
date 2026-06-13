"use client";
// components/ThemeToggle.js — Hell/Dunkel-Umschalter. Setzt data-theme auf <html>
// und merkt sich die Wahl in localStorage.
import { useEffect, useState } from "react";
import { Icon, I } from "@/components/icons";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem("db_theme") === "dark";
    setDark(v);
    document.documentElement.setAttribute("data-theme", v ? "dark" : "light");
  }, []);

  function toggle() {
    const v = !dark;
    setDark(v);
    localStorage.setItem("db_theme", v ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", v ? "dark" : "light");
  }

  return (
    <button className="db-chip" onClick={toggle} title="Hell/Dunkel umschalten" aria-label="Theme umschalten">
      <Icon d={dark ? I.spark : I.shield} size={14} />
      {dark ? "Hell" : "Dunkel"}
    </button>
  );
}
