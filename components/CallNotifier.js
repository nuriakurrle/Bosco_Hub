"use client";
// components/CallNotifier.js — Aviso global de "llamada en curso".
// Escucha en segundo plano el microservicio (/watch) desde cualquier página y, si
// hay una llamada de Twilio en curso, muestra un POPUP flotante abajo a la derecha
// (visible en toda la app) con enlace a la consola /llamada.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Misma regla que LiveCall: ws://localhost en dev, wss://live.<dominio> en prod.
function liveWsUrl() {
  if (typeof window === "undefined") return "ws://localhost:8787";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "ws://localhost:8787";
  return `wss://live.${window.location.host}`;
}

export default function CallNotifier() {
  const [active, setActive] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let stop = false;
    let ws;
    let retry;
    function connect() {
      if (stop) return;
      ws = new WebSocket(`${liveWsUrl()}/watch`);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "call") setActive(!!msg.active);
        } catch {}
      };
      // Reconecta si se cae (el aviso debe estar siempre escuchando).
      ws.onclose = () => { if (!stop) retry = setTimeout(connect, 4000); };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => { stop = true; clearTimeout(retry); ws?.close(); };
  }, []);

  // No mostrar el popup si ya estás en la consola (ahí ya ves la llamada).
  if (!active || pathname === "/llamada") return null;
  return (
    <div className="call-popup" role="status" aria-live="polite">
      <span className="call-popup-dot" />
      <div className="call-popup-text">
        <strong>Anruf läuft</strong>
        <span>Live-Transkription bereit</span>
      </div>
      <Link href="/llamada" className="call-popup-btn">Zur Konsole</Link>
    </div>
  );
}
