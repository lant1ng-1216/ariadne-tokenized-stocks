import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const port = 18787;
const child = spawn(process.execPath, ["--import", "tsx", "src/mcp/hosted-demo-server.ts"], {
  cwd: process.cwd(),
  env: { ...process.env, ARIADNE_MODE: "demo", ARIADNE_TRANSPORT: "http", HOST: "127.0.0.1", PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

try {
  let healthy = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      healthy = response.ok;
      if (healthy) break;
    } catch { /* wait for the server */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(healthy, true, `Hosted Demo did not become healthy: ${stderr}`);

  const client = new Client({ name: "ariadne-hosted-demo-test", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));
  await client.connect(transport);
  const tools = await client.listTools();
  assert.ok(tools.tools.some((tool) => tool.name === "research_tokenized_stock"));
  const result = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "NVDA", chainId: "56" } });
  const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
  assert.ok(text);
  const payload = JSON.parse(text!);
  assert.equal(payload.assets.length, 2);
  assert.equal(payload.outcome.sideEffects, "none");
  assert.equal(payload.timing.agentReasoningExcluded, true);
  assert.equal(payload.timing.marketContextRequests, 2);
  assert.ok(Number.isFinite(payload.timing.totalMs));
  assert.doesNotMatch(payload.presentation, /\| Rank \| Issuer \|/);
  assert.match(payload.presentation, /What Ariadne can do next/);
  assert.match(payload.presentation, /Ariadne research brief/);
  await transport.close();
  console.log(JSON.stringify({ healthcheck: true, remoteMcpConnection: true, researchWorkflow: true, demoOnly: true, sideEffects: "none", passed: true }, null, 2));
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1000))
  ]);
  if (!child.exitCode) child.kill("SIGKILL");
}
