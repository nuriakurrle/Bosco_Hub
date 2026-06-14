// components/Shell.js — App-Shell mit linker Navigations-Leiste + Topbar.
// Ersetzt die alte schmale Topbar-Navigation. Nutzt die linke Fläche dauerhaft
// und konsistent auf allen Seiten (Übersicht / Posteingang / Buchungen).
import Link from "next/link";
import { Icon, I } from "@/components/icons";
import SearchBox from "@/components/SearchBox";
import UserSwitcher from "@/components/UserSwitcher";
import DensityToggle from "@/components/DensityToggle";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { key: "dashboard", href: "/", label: "Übersicht", icon: "house" },
  { key: "kalender", href: "/kalender", label: "Kalender", icon: "calendar" },
  { key: "inbox", href: "/posteingang", label: "Posteingang", icon: "inbox" },
  { key: "buchungen", href: "/buchungen", label: "Buchungen", icon: "bed" },
  { key: "vertraege", href: "/vertraege", label: "Verträge", icon: "doc" },
];

export default function Shell({ active, staff = [], me, children }) {
  return (
    <div className="db-app db-shell" style={{ fontSize: 13 }}>
      {/* Linke Navigation */}
      <aside className="app-nav">
        <Link href="/" className="app-brand">
          <span className="mark">DB</span>
          <span className="app-brand-name">Belegung</span>
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

        <div className="app-nav-foot">
          <div className="app-nav-section">Team · {staff.length}</div>
          {staff.map((s) => (
            <div key={s.key} className="app-nav-person" title={s.skills ? `Kann: ${s.skills.replace(/,/g, ", ")}` : s.area || ""}>
              <span className="avatar sm">{s.short}</span>
              <span className="np-text">
                <span className="np-name">{s.name}{s.key === me ? " · ich" : ""}</span>
                <span className="np-area">{s.area || "—"}{s.skills ? ` · ${s.skills.split(",").length} Formate` : ""}</span>
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* Hauptbereich */}
      <div className="app-main">
        <div className="app-topbar">
          <SearchBox />
          <span style={{ flex: 1 }} />
          <ThemeToggle />
          <DensityToggle />
          <UserSwitcher staff={staff} me={me} />
        </div>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
