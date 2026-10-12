import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const bundle = readFileSync(resolve(import.meta.dirname, "../remote-mcp/generated/mcp.mjs"), "utf8");
for (const [view, marker] of [
  ["catalog", "Waiting for the BSC catalog"],
  ["research", "Waiting for the research result"],
  ["purchase approval", "Purchase review result could not be read"]
] as const) {
  assert.ok(bundle.includes(marker), `${view} HTML must be embedded in the remote MCP bundle`);
}
assert.match(bundle, /catalogUiHtml = true \?/, "the remote catalog view must use its build-time HTML, not a runtime source-file lookup");
assert.match(bundle, /researchUiHtml = true \?/, "the remote research view must use its build-time HTML");
assert.match(bundle, /purchaseApprovalUiHtml = true \?/, "the remote purchase view must use its build-time HTML");
console.log("Remote MCP UI bundle contains all three prebuilt App views; runtime source-file builders are unreachable.");
