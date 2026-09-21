import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(pkg.private, false);
assert.equal(pkg.main, "./dist-package/index.js");
assert.equal(pkg.types, "./dist-package/index.d.ts");
assert.ok(pkg.exports?.["."]?.import);
assert.ok(pkg.scripts.build);
assert.ok(pkg.scripts["pack:check"]);
const demoConfig = JSON.parse(await readFile("docs/mcp-config.demo.example.json", "utf8"));
const liveConfig = JSON.parse(await readFile("docs/mcp-config.live.example.json", "utf8"));
assert.deepEqual(demoConfig.mcpServers["ariadne-tokenized-stocks"].args, ["run", "mcp:demo"]);
assert.deepEqual(liveConfig.mcpServers["ariadne-tokenized-stocks"].args, ["--env-file=.env", "--import", "tsx", "src/mcp/server.ts"]);
assert.equal(JSON.stringify(liveConfig).includes("BINANCE_WEB3_API_SECRET"), false);
console.log(JSON.stringify({ packageReady: true, demoConfig: true, liveConfig: true, noSecretsInConfig: true, passed: true }, null, 2));
