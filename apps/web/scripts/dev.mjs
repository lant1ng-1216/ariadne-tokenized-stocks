import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(appRoot, "../..");
const mode = process.argv[2] === "demo" || process.env.ARIADNE_WEB_MODE === "demo" ? "demo" : "live";
const apiPort = process.env.ARIADNE_API_PORT ?? (mode === "demo" ? "18901" : "18902");
const apiScript = mode === "demo" ? "scripts/start-web-demo.ts" : "scripts/start-web-live.ts";
const envFile = resolve(repoRoot, ".env");
const apiOrigin = process.env.ARIADNE_API_ORIGIN ?? `http://127.0.0.1:${apiPort}`;
let api;

try {
  const response = await fetch(`${apiOrigin}/api/health`, { signal: AbortSignal.timeout(1200) });
  if (!response.ok) throw new Error(`API health returned ${response.status}`);
  console.log(`Reusing existing Ariadne API at ${apiOrigin}`);
} catch {
  if (mode === "live" && !existsSync(envFile)) {
    console.error("Missing repository .env; set ARIADNE_WEB_MODE=demo for a no-credentials preview.");
    process.exit(1);
  }
  const apiArgs = mode === "live"
    ? ["--env-file", envFile, "--import", "tsx", apiScript]
    : ["--import", "tsx", apiScript];
  api = spawn(process.execPath, apiArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ARIADNE_WEB_PORT: apiPort }
  });
}
const nextBin = resolve(appRoot, "node_modules/next/dist/bin/next");
const next = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
  cwd: appRoot,
  stdio: "inherit",
  env: { ...process.env, ARIADNE_API_ORIGIN: apiOrigin }
});

function stop(signal = "SIGTERM") {
  if (api && !api.killed) api.kill(signal);
  if (!next.killed) next.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
api?.on("exit", (code) => { if (code && code !== 0) stop(); });
next.on("exit", (code) => { if (code && code !== 0) stop(); });
