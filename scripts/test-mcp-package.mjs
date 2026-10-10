import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = process.cwd();
const temporaryRoot = await mkdtemp(join(tmpdir(), "ariadne-mcp-package-"));
const npmCache = join(temporaryRoot, "npm-cache");

function run(command, args, cwd = root, timeoutMs = 300_000) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolveRun({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

try {
  await run("npm", ["run", "build:mcp-package"]);
  const stagedManifest = JSON.parse(await readFile(resolve(root, ".artifacts/mcp-package/package.json"), "utf8"));
  assert.equal(stagedManifest.name, "ariadne-tokenized-stocks-mcp");
  assert.equal(stagedManifest.bin["ariadne-mcp"], "./dist/mcp/server.js");
  assert.equal(stagedManifest.dependencies.zod, "^4.6.5");

  const pack = await run("npm", ["pack", resolve(root, ".artifacts/mcp-package"), "--pack-destination", temporaryRoot, "--cache", npmCache]);
  const tarball = join(temporaryRoot, pack.stdout.trim().split(/\r?\n/).at(-1));
  await writeFile(join(temporaryRoot, "package.json"), `${JSON.stringify({ name: "ariadne-mcp-consumer", private: true, type: "module" }, null, 2)}\n`);
  await run("npm", ["install", "--ignore-scripts", "--no-package-lock", "--no-audit", "--no-fund", "--cache", npmCache, tarball], temporaryRoot);

  const executable = resolve(temporaryRoot, "node_modules/.bin/ariadne-mcp");
  const client = new Client({ name: "ariadne-mcp-package-test", version: "0.1.0" });
  const transport = new StdioClientTransport({ command: executable, env: { ...process.env, ARIADNE_MODE: "demo", ARIADNE_WALLET_HANDOFF_RELAY_URL: "" }, stderr: "pipe" });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.ok(listed.tools.some((tool) => tool.name === "browse_tokenized_stock_catalog"));
    assert.ok(listed.tools.some((tool) => tool.name === "research_tokenized_stock"));
    const result = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "NVDA", chainId: "56" } });
    const payload = result.structuredContent ?? JSON.parse(result.content.find((item) => item.type === "text" && item.text.trimStart().startsWith("{"))?.text ?? "null");
    assert.ok(payload && typeof payload === "object");
    assert.equal(payload.outcome.sideEffects, "none");
    assert.equal(payload.assets.length, 2);
  } finally {
    await transport.close();
  }
  console.log(JSON.stringify({ standaloneManifest: true, executable: "ariadne-mcp", isolatedInstall: true, demoLaunch: true, toolsListed: true, readOnlyResearch: true, sideEffects: "none", passed: true }, null, 2));
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
