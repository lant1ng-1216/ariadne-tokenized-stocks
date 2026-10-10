import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildExternalWalletApprovalPageHtml } from "../src/mcp/ui/external-wallet-approval-page-html.js";

const [zh, en] = await Promise.all([
  buildExternalWalletApprovalPageHtml("zh-CN"),
  buildExternalWalletApprovalPageHtml("en")
]);
assert.match(zh, /<html lang="zh-CN">/);
assert.match(zh, /购买复核/);
assert.match(zh, /预计到账/);
assert.match(en, /<html lang="en">/);
assert.match(en, /Purchase review/);
assert.match(en, /Expected output/);
assert.match(en, /Full transaction details/);
assert.doesNotMatch(en, />预计到账</);
assert.doesNotMatch(en, />完整交易信息</);

const source = readFileSync(resolve(import.meta.dirname, "../src/mcp/ui/external-wallet-approval-page.ts"), "utf8");
assert.match(source, /pageLanguage = new URLSearchParams\(location\.search\)\.get\("lang"\)/);
assert.match(source, /snapshot\.reviewMode === "purchase_intent"/);
assert.match(source, /method: "eth_requestAccounts"/);
assert.match(source, /method: "wallet_switchEthereumChain"/);
assert.match(source, /\/bind-wallet/);
assert.match(source, /Exact plan ready/);
assert.match(source, /USDT allowance is insufficient/);
assert.match(source, /Purchase confirmed/);

console.log("External wallet i18n contract passed: Chinese and English shells are distinct, and runtime wallet, quote, allowance and result states have English copy.");
