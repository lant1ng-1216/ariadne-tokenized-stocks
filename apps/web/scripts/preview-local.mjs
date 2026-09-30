// A detached local-only Next.js process survives the agent's terminal session.
// It starts just the visual preview, never a trading API or wallet service.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, openSync, closeSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
// Also keep the existing read-only Demo API alive; never load live credentials here.
if (!process.env.ARIADNE_API_ORIGIN) {
  spawnSync(process.execPath, [resolve(root, "scripts/preview-api.mjs")], { stdio: "inherit" });
}
const port = 3000;
const occupied = await new Promise(resolve => {
  const socket = createConnection({ host: "127.0.0.1", port });
  socket.on("connect", () => { socket.destroy(); resolve(true); });
  socket.on("error", () => resolve(false));
});
if (occupied) {
  console.log("Port 3000 already has a server. Leaving it untouched; inspect http://localhost:3000.");
  process.exit(0);
}
mkdirSync(resolve(root, ".local"), { recursive: true });
const log = openSync(resolve(root, ".local/preview.log"), "a");
const child = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: root, detached: true, stdio: ["ignore", log, log], env: process.env,
});
child.on("error", error => { console.error(error); process.exitCode = 1; });
if (child.pid) writeFileSync(resolve(root, ".local/preview.pid"), String(child.pid));
closeSync(log);
child.unref();
console.log(`Local preview starting at http://localhost:3000 (PID ${child.pid}). Log: apps/web/.local/preview.log`);
