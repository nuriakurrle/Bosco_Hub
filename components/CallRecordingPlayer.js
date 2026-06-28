"use client";
// components/CallRecordingPlayer.js — Reproductor de la grabación de la llamada.
// Mismo diseño que el player del prototipo (botón + waveform + tiempo), pero esta
// vez sobre un <audio> REAL: reproduce el mp3 que sirve /api/live-call/recording/[id]
// (proxy autenticado a Twilio). La onda avanza con el tiempo real de reproducción.
import { useEffect, useRef, useState } from "react";

// Waveform decorativa (mismo patrón que el prototipo); el progreso sí es real.
const WAVE = Array.from(
  { length: 56 },
  (_, i) => 5 + Math.round(13 * Math.abs(Math.sin(i * 0.6) * Math.cos(i * 0.31)))
);

function fmt(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallRecordingPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDur(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  function seek(e) {
    const a = audioRef.current;
    if (!a || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur));
  }

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button className="audio-play-btn" onClick={toggle} title={playing ? "Pause" : "Abspielen"}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z" /></svg>
        )}
      </button>
      <div className="waveform" onClick={seek} title="Zum Spulen klicken">
        {WAVE.map((h, i) => {
          const barT = dur ? (i / WAVE.length) * dur : 0;
          return <span key={i} className={`bar ${dur && barT <= time ? "played" : ""}`} style={{ height: h * 1.6 }} />;
        })}
      </div>
      <span className="audio-time">{fmt(time)} / {fmt(dur)}</span>
    </div>
  );
}
