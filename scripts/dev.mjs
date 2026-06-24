// scripts/dev.mjs — arranque de desarrollo: levanta el dashboard Y el microservicio
// de llamadas con un solo `npm run dev`.
//
// Antes esto solo lanzaba `next dev`; el microservicio (live-call/) había que
// arrancarlo a mano en otra terminal, lo que causaba confusión ("¿está corriendo?
// ¿por qué el puerto 8787 está ocupado?"). Ahora ambos viven y mueren juntos.
//
// Notas:
// - NODE_ENV=development forzado: algunos shells exportan production global, y
//   con production `next dev` parsea mal el CSS global (`:root`).
// - El microservicio es OPCIONAL: si no arranca (p. ej. el 8787 ya está ocupado
//   por otra instancia), se avisa pero el dashboard sigue. Así nunca bloquea.
// Zero dependencias, multiplataforma (Windows/macOS/Linux).
import { spawn } from "node:child_process";

process.env.NODE_ENV = "development";

// 1) Dashboard (Next). Es el proceso principal: cuando muere, se acaba todo.
const dashboard = spawn("next", ["dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true, // resuelve el bin `next` desde node_modules/.bin (y next.cmd en Windows)
  env: process.env,
});

// 2) Microservicio de transcripción en vivo (WebSocket en :8787).
const liveCall = spawn("node", ["server.js"], {
  cwd: new URL("../live-call/", import.meta.url),
  stdio: "inherit",
  env: process.env,
});
liveCall.on("error", (e) => console.error("[live-call] no se pudo arrancar:", e.message));
liveCall.on("exit", (code) => {
  if (code) console.error(`[live-call] salió con código ${code} (¿el puerto 8787 ya está en uso?). El dashboard sigue.`);
});

// Apaga el microservicio cuando se cierra el dashboard o se corta el proceso.
function shutdown() {
  liveCall.kill();
  dashboard.kill();
}
dashboard.on("exit", (code) => { liveCall.kill(); process.exit(code ?? 0); });
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
