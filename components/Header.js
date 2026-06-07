// components/Header.js — Top bar with working navigation.
// Receives the team, the current user and the active section from the server.
import Link from "next/link";
import { Icon, I } from "@/components/icons";
import UserSwitcher from "@/components/UserSwitcher";

export default function Header({ staff = [], me, active = "inbox" }) {
  const activeChip = { background: "rgba(255,255,255,0.22)", color: "#fff" };

  return (
    <header className="db-header">
      <Link href="/" className="db-brand">
        <span className="mark">DB</span>Intake
      </Link>
      <div className="db-search" style={{ maxWidth: 320 }}>
        <Icon d={I.search} size={14} />
        <span>Schule, Kontakt, Anfrage suchen…</span>
      </div>
      <span className="spacer" />
      <span className="db-chip">
        <Icon d={I.users} size={13} /> Team ({staff.length})
      </span>
      <Link href="/" className="db-chip" style={active === "inbox" ? activeChip : undefined}>
        <Icon d={I.inbox} size={13} /> Posteingang
      </Link>
      <Link
        href="/buchungen"
        className="db-chip"
        style={active === "buchungen" ? activeChip : undefined}
      >
        <Icon d={I.bed} size={13} /> Buchungen
      </Link>
      <UserSwitcher staff={staff} me={me} />
    </header>
  );
}
