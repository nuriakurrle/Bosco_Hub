"use client";
// components/SearchBox.js — funktionsfähige Kopfzeilen-Suche.
// Sucht über alle Anfragen (Schule, Kontakt, Betreff) — navigiert zum
// Posteingang mit ?q=… , wo die Liste gefiltert wird.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I } from "@/components/icons";

export default function SearchBox() {
  const router = useRouter();
  const [v, setV] = useState("");

  function submit(e) {
    e.preventDefault();
    const t = v.trim();
    router.push(t ? `/posteingang?q=${encodeURIComponent(t)}` : "/posteingang");
  }

  return (
    <form className="db-search" onSubmit={submit}>
      <Icon d={I.search} size={14} />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Schule, Kontakt, Anfrage suchen…"
        aria-label="Suche"
      />
    </form>
  );
}
