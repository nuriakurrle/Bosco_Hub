"use client";
// components/UserSwitcher.js — Simple "who am I" picker in the top bar.
// Stores the choice in a cookie (`zuk_me`) and reloads so the server reads it.
// No passwords (internal tool). Can be swapped for a real login later.
import { useState } from "react";

export default function UserSwitcher({ staff = [], me }) {
  const [open, setOpen] = useState(false);
  const current = staff.find((s) => s.key === me) || staff[0];

  function pick(key) {
    document.cookie = `zuk_me=${key}; path=/; max-age=31536000`;
    window.location.reload();
  }

  if (!current) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        className="db-user"
        title={`Angemeldet als ${current.name} — wechseln`}
        onClick={() => setOpen((o) => !o)}
        style={{ cursor: "pointer", border: "none" }}
      >
        {current.short}
      </button>
      {open && (
        <>
          {/* click outside to close */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 55 }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 40,
              background: "var(--db-paper)",
              border: "1px solid var(--db-line)",
              borderRadius: 8,
              boxShadow: "0 8px 24px -6px rgba(40,20,25,.25)",
              padding: 6,
              minWidth: 200,
              zIndex: 60,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "var(--db-text-faint)",
                padding: "4px 8px 6px",
              }}
            >
              Angemeldet als
            </div>
            {staff.map((s) => (
              <button
                key={s.key}
                onClick={() => pick(s.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: s.key === me ? "var(--db-primary-tint)" : "transparent",
                  borderRadius: 6,
                  padding: "6px 8px",
                  cursor: "pointer",
                  color: "var(--db-text)",
                  fontSize: 13,
                }}
              >
                <span className="assignee-av" style={{ background: "#d9b89a" }}>
                  {s.short}
                </span>
                <span style={{ lineHeight: 1.25 }}>
                  {s.name}
                  <br />
                  <span style={{ fontSize: 11, color: "var(--db-text-faint)" }}>{s.area}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
