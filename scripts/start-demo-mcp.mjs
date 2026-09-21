import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["--import", "tsx", "src/mcp/server.ts"], {
  cwd: process.cwd(),
  env: { ...process.env, ARIADNE_MODE: "demo" },
  stdio: "inherit"
});
child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 1));
