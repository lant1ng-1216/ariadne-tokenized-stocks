import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildExternalWalletApprovalPageHtml } from "../src/mcp/ui/external-wallet-approval-page-html.js";
import { bscScanTransactionUrl, walletWatchAssetRequest } from "../src/mcp/ui/post-transaction-actions.js";

const root = resolve(import.meta.dirname, "..");
const html = await buildExternalWalletApprovalPageHtml();
const browserSource = readFileSync(resolve(root, "src/mcp/ui/external-wallet-approval-page.ts"), "utf8");
const postTransactionSource = readFileSync(resolve(root, "src/mcp/ui/post-transaction-actions.ts"), "utf8");

assert.match(html, /Binance Web3/);
assert.match(html, /class="network"><img src="data:image\/svg\+xml;base64,/);
assert.match(html, /class="intro"/);
assert.match(html, /class="dashboard"/);
assert.match(html, /id="badge-canvas"/);
assert.match(html, /data:image\/webp;base64,/);
assert.match(html, /data-view="intro"/);
assert.match(html, /data-view=dashboard/);
assert.doesNotMatch(html, /class="data-horizon"|@keyframes horizon-|class="orbit"|@keyframes orbit|class="intro-grid"/);
assert.match(html, /\.intro\{[^}]*background:#030303/);
assert.match(html, /prefers-reduced-motion/);
assert.match(html, /--bg:#030303/);
assert.match(html, /height:100dvh/);
assert.match(html, /html,body\{[^}]*overflow:hidden/);
assert.match(html, /原计划 → 最新执行条件/);
assert.match(html, /MetaMask/);
assert.match(html, /alt="BNB Chain">BSC<\/span>/);
assert.match(html, /Binance Web3 返回的 BSC 代币 OHLC K 线/);
assert.match(html, /data-chart-interval="5m"/);
assert.match(html, /data-chart-interval="1d"/);
assert.match(html, /预计到账/);
assert.match(html, /id="asset-logo"/);
assert.match(html, /id="issuer-logo"/);
assert.doesNotMatch(html, /<div class="asset-mark">NV<\/div>/);
assert.match(html, /class="compare-row"/);
assert.match(html, /id="baseline-minimum"/);
assert.match(html, /id="baseline-network-fee"/);
assert.match(html, /id="network-fee-change"/);
assert.doesNotMatch(html, /grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(html, /Ariadne 交易执行终端/);
assert.match(html, /ARIADNE EXECUTION CONSOLE/);
assert.match(html, /id="execution-request"/);
assert.match(html, /id="execution-allowance-current"/);
assert.match(html, /id="execution-allowance-required"/);
assert.match(html, /id="execution-gap"/);
assert.match(html, /id="execution-stage-index"/);
assert.match(html, /id="execution-funds"/);
assert.match(html, /id="execution-events"/);
assert.match(html, /id="execution-next-action"/);
assert.match(html, /id="flow-allowance"/);
assert.match(html, /class="journey-track" aria-label="执行阶段状态"/);
assert.match(html, /class="flow-state"/);
assert.doesNotMatch(html, /计划、报价、授权、钱包与链上确认进度/);
assert.doesNotMatch(html, /\.journey-track:before|\.journey-track:after|--journey-progress|class="allowance-meter"/);
assert.match(html, /\.plan-side\{[^}]*grid-template-rows:auto auto minmax\(0,1fr\)[^}]*overflow:hidden/);
assert.doesNotMatch(html, /钱包地址未变化|买入金额未变化|股票标的未变化|滑点限制未变化/);
assert.doesNotMatch(html, /id="manual-wallet"/);
assert.match(html, /class="wallet-zone" role="region" tabindex="0"/);
assert.match(html, /\.wallet-zone\{[^}]*max-height:none[^}]*overflow-y:auto/);
assert.match(html, /\.wallet-zone\{[^}]*overscroll-behavior:contain/);
const walletZoneStyles = html.match(/\.wallet-zone\{([^}]*)\}/)?.[1] ?? "";
assert.match(walletZoneStyles, /border:0/);
assert.match(walletZoneStyles, /border-top:1px solid var\(--line\)/);
assert.match(walletZoneStyles, /border-radius:0/);
assert.match(walletZoneStyles, /background:transparent/);
assert.match(html, /\.wallet-zone::-webkit-scrollbar/);
assert.match(html, /\.wallet-zone:focus-visible/);
const mobileStyles = html.slice(html.indexOf("@media(max-width:820px)"));
assert.match(mobileStyles, /\.wallet-zone\{height:auto;max-height:none;overflow:visible/);
assert.match(mobileStyles, /\.plan-side\{grid-template-rows:auto auto auto/);
assert.match(mobileStyles, /\.journey-track\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(html, /font-variant-numeric:tabular-nums lining-nums/);
assert.match(html, /完整购买计划与交易参数/);
assert.match(html, /id="post-transaction-actions"/);
assert.match(html, /id="explorer-link"/);
assert.match(html, /id="watch-asset"/);
assert.match(html, /图表组件 · TradingView Lightweight Charts/);
assert.doesNotMatch(html, /market-chart-frame|widgetembed|CRYPTO:NVDABNUSD/);
assert.match(browserSource, /marketReference\?\.chainId === "56"/);
assert.match(browserSource, /typeof marketReference\.platformId === "string"/);
assert.match(browserSource, /\/candles\?/);
assert.match(browserSource, /new WebGLRenderer/);
assert.match(browserSource, /new CylinderGeometry/);
assert.match(browserSource, /new MeshPhysicalMaterial/);
assert.match(browserSource, /new PointLight/);
assert.match(browserSource, /revealDashboard/);
assert.doesNotMatch(browserSource, /method: "eth_accounts"/);
assert.match(browserSource, /method: "eth_requestAccounts"/, "a wallet-free purchase intent asks MetaMask for the currently selected account before creating an exact plan");
assert.match(browserSource, /method: "wallet_switchEthereumChain"/);
assert.match(browserSource, /\/bind-wallet/);
assert.match(browserSource, /eth_sendTransaction/);
assert.match(browserSource, /transaction_request_started/);
assert.match(browserSource, /\/client-stage/);
assert.match(browserSource, /\/client-failure/);
assert.match(browserSource, /\/finalize-allowance/);
assert.match(browserSource, /当前 USDT 授权额度不足/);
assert.match(browserSource, /股票尚未买入/);
assert.match(browserSource, /allowanceMetrics/);
assert.match(browserSource, /createEVMClient/);
assert.match(browserSource, /client\.connectWith/);
assert.match(browserSource, /connect_execute_started/);
assert.match(browserSource, /connect_execute_resolved/);
assert.match(browserSource, /account: reviewedAccount/);
assert.match(browserSource, /chainIds: \["0x38"\]/);
assert.doesNotMatch(browserSource, /再次唤起 MetaMask/);
assert.ok(browserSource.indexOf('reportClientStage("transaction_request_started"') < browserSource.indexOf('method: "eth_sendTransaction"'), "the exact transaction invocation stage is persisted before MetaMask is called");
assert.equal((browserSource.match(/method: "eth_sendTransaction"/g) ?? []).length, 1, "the portal contains exactly one transaction invocation call site");
assert.doesNotMatch(browserSource, /setTimeout\(\(\) => \{ void runWalletFlow\(\)\.catch\(handleWalletStartError\); \}, (?:650|1_200)\)/);
assert.match(browserSource, /没有检测到 MetaMask/);
assert.match(browserSource, /selectMetaMaskProvider/);
assert.match(browserSource, /io\.metamask/);
assert.match(browserSource, /OFFICIAL_UNDERLYING_LOGOS/);
assert.match(browserSource, /walletAttemptClaimedAt/);
assert.match(browserSource, /display\.tokenLogoUrl/);
assert.match(browserSource, /display\.issuerLogoUrl/);
assert.match(browserSource, /localizeKnownStatus/);
assert.match(browserSource, /appendExecutionEvent/);
assert.match(browserSource, /list\.children\.length > 12/);
assert.match(browserSource, /region\.scrollTop = region\.scrollHeight/);
assert.match(browserSource, /USDT 授权额度尚未核实为充足/);
assert.match(postTransactionSource, /wallet_watchAsset/);
assert.match(browserSource, /bscScanTransactionUrl/);

const transactionHash = `0x${"12".repeat(32)}`;
assert.equal(bscScanTransactionUrl(transactionHash), `https://bscscan.com/tx/${transactionHash}`);
assert.equal(bscScanTransactionUrl("0x1234"), undefined);
const bStocksAsset = walletWatchAssetRequest({
  operation: "purchase", issuer: "bStocks", outputContract: `0x${"23".repeat(20)}`,
  outputSymbol: "NVDAB", tokenLogoUrl: "https://assets.example/nvdab.png",
  purchaseBaseline: { outputDecimals: 18 }
});
const ondoAsset = walletWatchAssetRequest({
  operation: "purchase", issuer: "Ondo", outputContract: `0x${"34".repeat(20)}`,
  outputSymbol: "NVDAon", tokenLogoUrl: "https://assets.example/nvdaon.png",
  purchaseBaseline: { outputDecimals: 18 }
});
assert.deepEqual(bStocksAsset?.params.options, {
  address: `0x${"23".repeat(20)}`, symbol: "NVDAB", decimals: 18, image: "https://assets.example/nvdab.png"
});
assert.deepEqual(ondoAsset?.params.options, {
  address: `0x${"34".repeat(20)}`, symbol: "NVDAon", decimals: 18, image: "https://assets.example/nvdaon.png"
});
assert.equal(walletWatchAssetRequest({ operation: "allowance_approval", outputContract: `0x${"34".repeat(20)}`, outputSymbol: "NVDAon", purchaseBaseline: { outputDecimals: 18 } }), undefined);

console.log("Approval page contract passed: cinematic entry, integrated execution line, exact BSC identity, optional Binance K-lines, one MetaMask Connect transaction flow, exact BscScan handoff, and issuer-neutral bStocks/Ondo wallet_watchAsset requests.");
