"use client";
// components/CallNotifier.js — Aviso global de "llamada en curso".
// Escucha en segundo plano el microservicio (/watch) desde cualquier página y, si
// hay una llamada de Twilio en curso, muestra un badge pulsante arriba a la derecha
// (en la topbar del Shell) con enlace a la consola /llamada.
import { useEffect, useState } from "react";
import Link from "next/link";

// Misma regla que LiveCall: ws://localhost en dev, wss://live.<dominio> en prod.
function liveWsUrl() {
  if (typeof window === "undefined") return "ws://localhost:8787";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "ws://localhost:8787";
  return `wss://live.${window.location.host}`;
}

export default function CallNotifier() {
  const [active, setActive] = useState(false);

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

  if (!active) return null;
  return (
    <Link href="/llamada" className="call-badge" title="Telefonat läuft — zur Konsole">
      <span className="call-dot" />
      Anruf läuft
    </Link>
  );
}
