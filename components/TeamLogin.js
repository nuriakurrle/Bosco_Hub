"use client";
// components/TeamLogin.js — Mitarbeiter-Anmeldung in der linken Navigationsleiste.
// Klick auf einen Namen meldet diesen Mitarbeiter an: speichert die Wahl im
// Cookie `zuk_me` und lädt neu, damit der Server sie liest. Ersetzt den früheren
// UserSwitcher in der Topbar; die Anmeldung passiert jetzt direkt in der
// Team-Liste unten in der roten Navigationsleiste.
export default function TeamLogin({ staff = [], me }) {
  function pick(key) {
    if (key === me) return; // schon angemeldet
    document.cookie = `zuk_me=${key}; path=/; max-age=31536000`;
    window.location.reload();
  }

  return (
    <div className="app-nav-foot">
      <div className="app-nav-section">Anmelden als · {staff.length}</div>
      {staff.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => pick(s.key)}
          className={`app-nav-person ${s.key === me ? "active" : ""}`}
          title={s.key === me ? `Angemeldet als ${s.name}` : `Als ${s.name} anmelden`}
        >
          <span className="avatar sm">{s.short}</span>
          <span className="np-text">
            <span className="np-name">{s.name}{s.key === me ? " · ich" : ""}</span>
            <span className="np-area">{s.area || "—"}{s.skills ? ` · ${s.skills.split(",").length} Formate` : ""}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
