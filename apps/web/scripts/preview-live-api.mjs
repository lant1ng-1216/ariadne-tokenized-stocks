// Keep the signed read-only research API separate from the persistent demo API.
import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const app = fileURLToPath(new URL("..", import.meta.url));
const root = resolve(app, "../..");
const envFile = resolve(root, ".env");
const occupied = await new Promise(resolve => {
  const socket = createConnection({ host: "127.0.0.1", port: 18902 });
  socket.on("connect", () => { socket.destroy(); resolve(true); });
  socket.on("error", () => resolve(false));
});
if (occupied) {
  console.log("Port 18902 already in use; left untouched.");
  process.exit(0);
}
if (!existsSync(envFile)) {
  console.error("Ariadne live read-only API requires the repository .env file.");
  process.exit(1);
}
mkdirSync(resolve(app, ".local"), { recursive: true });
const log = openSync(resolve(app, ".local/api-live-preview.log"), "a");
const child = spawn(process.execPath, ["--env-file", envFile, "--import", "tsx", "scripts/start-web-live.ts"], {
  cwd: root,
  detached: true,
  stdio: ["ignore", log, log],
  env: { ...process.env, ARIADNE_WEB_PORT: "18902" }
});
child.on("error", error => { console.error(error); process.exitCode = 1; });
child.unref();
closeSync(log);
console.log("Read-only live API starting on localhost:18902. Credentials remain server-side; no signing or broadcast.");
