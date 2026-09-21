import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const quickstart = await readFile("docs/QUICKSTART.md", "utf8");
const readme = await readFile("README.md", "utf8");
assert.match(quickstart, /npm run mcp:demo/);
assert.match(quickstart, /research_tokenized_stock/);
assert.match(quickstart, /No Binance account, API key or wallet is needed/);
assert.match(quickstart, /Do not trade/);
assert.match(readme, /18 MCP tools/);
assert.match(readme, /natural-language tokenized-stock research brief/);
console.log(JSON.stringify({ demoPath: true, naturalLanguagePath: true, safetyBoundary: true, passed: true }, null, 2));
