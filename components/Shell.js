// components/Shell.js — App-Shell mit linker Navigations-Leiste + Topbar.
// Ersetzt die alte schmale Topbar-Navigation. Nutzt die linke Fläche dauerhaft
// und konsistent auf allen Seiten (Übersicht / Posteingang / Buchungen).
import Link from "next/link";
import { Icon, I } from "@/components/icons";
import TeamLogin from "@/components/TeamLogin";
import CallNotifier from "@/components/CallNotifier";

const NAV = [
  { key: "dashboard", href: "/", label: "Übersicht", icon: "house" },
  { key: "kalender", href: "/kalender", label: "Kalender", icon: "calendar" },
  { key: "inbox", href: "/posteingang", label: "Posteingang", icon: "inbox" },
  { key: "live", href: "/llamada", label: "Telefon", icon: "clock" },
  { key: "buchungen", href: "/buchungen", label: "Buchungen", icon: "bed" },
  { key: "vertraege", href: "/vertraege", label: "Verträge", icon: "doc" },
];

export default function Shell({ active, staff = [], me, children }) {
  return (
    <div className="db-app db-shell" style={{ fontSize: 13 }}>
      {/* Linke Navigation */}
      <aside className="app-nav">
        <Link href="/" className="app-brand">
          <img src="/logo.png" alt="ZUK Benediktbeuern" className="brand-logo" />
          <span className="app-brand-name">Bosco Hub</span>
        </Link>

        <nav className="app-nav-list">
          <div className="app-nav-section">Arbeitsbereich</div>
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} className={`app-nav-item ${active === n.key ? "active" : ""}`}>
              <Icon d={I[n.icon]} size={16} />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>

        <TeamLogin staff={staff} me={me} />
      </aside>

      {/* Hauptbereich — die Suche sitzt jetzt direkt über der Anfragen-Liste
          (siehe Inbox.js), daher hier keine separate Topbar mehr. */}
      <div className="app-main">
        <div className="app-content">{children}</div>
      </div>

      {/* Popup flotante de llamada en curso (position: fixed) */}
      <CallNotifier />
    </div>
  );
}
