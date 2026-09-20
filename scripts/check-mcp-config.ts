import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile("docs/mcp-config.example.json", "utf8"));
const server = config.mcpServers?.["ariadne-tokenized-stocks"];
assert.equal(server.command, "node");
assert.deepEqual(server.args, ["--env-file=.env", "--import", "tsx", "src/mcp/server.ts"]);
assert.match(server.cwd, /absolute\/path/);
assert.equal(JSON.stringify(config).includes("BINANCE_WEB3_API_SECRET"), false);
console.log("MCP config example passed");
