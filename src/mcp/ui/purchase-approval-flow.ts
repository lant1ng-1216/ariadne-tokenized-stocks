export type JsonRecord = Record<string, unknown>;

export function formatAgentSettlementReportMessage(report: JsonRecord): string {
  return `Ariadne 自动交易状态通知（由 Ariadne 面板发送）：这笔购买流程已到达可报告状态。请根据以下机器核验事实，主动说明最后成功阶段、失败或成功原因、交易哈希、资金是否变化和下一步；如果结果不是 confirmed_success，必须明确说未能确认购买成功。txHash 为 null 时必须明确说明没有提交链上交易，不能暗示发生了购买。\n${JSON.stringify(report, null, 2)}`;
}

export function formatAgentAllowanceReportMessage(report: JsonRecord): string {
  return `Ariadne 自动核验结果：USDT 授权与股票买入是两笔独立操作。请依据以下核验结果报告；如果没有后续购买确认，明确说明具体阻止原因，并说明股票没有买入。\n${JSON.stringify(report, null, 2)}`;
}

export function renderPurchasePlanMonitorView(
  payload?: JsonRecord,
  statusMessage?: string,
  hash?: string,
  agentReportStatus?: string
): string {
  const zh = payload?.language === "zh-CN";
  const status = statusMessage || (zh
    ? "计划与外部浏览器链接已在对话中准备好；等待你自行打开后继续核验。"
    : "The plan and external-browser link are ready in the conversation; waiting for you to open it.");
  const issuer = isRecord(payload?.selectedAsset) && typeof payload.selectedAsset.platformName === "string"
    ? payload.selectedAsset.platformName : "bStocks";
  const ticker = isRecord(payload?.selectedAsset) && typeof payload.selectedAsset.tokenSymbol === "string"
    ? payload.selectedAsset.tokenSymbol : "BSC stock";
  return `<section class="monitor-shell" aria-label="${zh ? "Ariadne 交易状态监听" : "Ariadne transaction monitor"}">
    <div class="monitor-line" aria-hidden="true"><i></i></div>
    <div class="monitor-copy"><span class="monitor-kicker">ARIADNE · BSC ${zh ? "终局监听" : "SETTLEMENT MONITOR"}</span><strong>${escapeHtml(issuer)} · ${escapeHtml(ticker)}</strong></div>
    <p class="monitor-status" role="status" aria-live="polite">${escapeHtml(status)}</p>
    ${hash ? `<code class="monitor-hash">${escapeHtml(hash)}</code>` : ""}
    ${agentReportStatus ? `<p class="monitor-report">${escapeHtml(agentReportStatus)}</p>` : ""}
  </section>`;
}

export type Eip1193WalletProvider = {
  request(args: { method: string; params?: readonly unknown[] | object }): Promise<unknown>;
  closeSession?: () => Promise<void>;
};

export type ServerToolCaller = (params: { name: string; arguments: JsonRecord }) => Promise<unknown>;

export type ReadOnlyWalletConnection = { account: string; chainId: "0x38" };

/** Only permit a real web origin for WalletConnect; MCP sandbox `null` origins fail closed. */
export function requireStableWalletConnectOrigin(origin: string): string {
  try {
    const parsed = new URL(origin);
    const isHttps = parsed.protocol === "https:";
    const isLocalHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if ((isHttps || isLocalHttp) && parsed.origin === origin && !parsed.username && !parsed.password) return parsed.origin;
  } catch {
    // Use the same fail-closed response for opaque and malformed origins.
  }
  const reportedOrigin = origin.length > 0 ? origin.slice(0, 128) : "(empty)";
  const originProblem = origin === "null" ? "an opaque null origin" : "an unsupported or unstable app origin";
  throw new Error(`This Agent host exposed ${originProblem} (${reportedOrigin}); WalletConnect requires a stable HTTPS app origin.`);
}

/** Accept hosted HTTPS wallet pages or the local one-link launcher; reject local direct portal URLs that Codex may keep in its side panel. */
export function requireSupportedWalletOpenUrl(value: string): string {
  try {
    const parsed = new URL(value);
    const hasNoCredentials = !parsed.username && !parsed.password;
    if (parsed.protocol === "https:" && hasNoCredentials) return parsed.href;
    const isLoopbackHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (isLoopbackHttp && hasNoCredentials && /^\/open-external\/[a-f0-9]{32}$/.test(parsed.pathname) && /^[A-Za-z0-9_-]{40,}$/.test(parsed.hash.slice(1))) return parsed.href;
  } catch {
    // Use the same fail-closed error for malformed and unsupported portal URLs.
  }
  throw new Error("Ariadne must open the wallet page through HTTPS or its local system-browser launcher.");
}

/** Connect to the wallet and read its account/network without requesting any transaction method. */
export async function readOnlyWalletConnection(provider: Eip1193WalletProvider): Promise<ReadOnlyWalletConnection> {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) {
    throw new Error("The wallet did not expose a valid account; no transaction was requested.");
  }
  const chainId = await provider.request({ method: "eth_chainId" });
  if (typeof chainId !== "string" || !/^0x[0-9a-fA-F]+$/.test(chainId) || BigInt(chainId) !== 56n) {
    throw new Error("The connected wallet is not on BSC chain 56; no transaction was requested.");
  }
  return { account: accounts[0], chainId: "0x38" };
}

export class WalletHandoffError extends Error {
  constructor(
    message: string,
    readonly txHash?: string,
    readonly submissionWasReserved = false,
    readonly hashRegistered = false
  ) {
    super(message);
    this.name = "WalletHandoffError";
  }
}

export function parseToolPayload(result: unknown): JsonRecord {
  if (!result || typeof result !== "object") throw new Error("The Agent host returned no MCP tool result");
  const record = result as JsonRecord;
  if (record.isError === true) throw new Error("The Agent host reported that the MCP tool call failed");
  if (record.structuredContent && typeof record.structuredContent === "object" && !Array.isArray(record.structuredContent)) {
    return record.structuredContent as JsonRecord;
  }
  const content = record.content;
  if (Array.isArray(content)) {
    const text = content.find((item) => item && typeof item === "object" && (item as JsonRecord).type === "text") as JsonRecord | undefined;
    if (typeof text?.text === "string") {
      const parsed: unknown = JSON.parse(text.text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as JsonRecord;
    }
  }
  throw new Error("The Agent host returned an unreadable MCP tool result");
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type ExactWalletRequest = JsonRecord & { from: string; to: string; value: string; data: string; gas: string; gasPrice: string };

function getWalletRequest(payload: JsonRecord): { planId: string; account: string; chainId: "0x38"; request: ExactWalletRequest } {
  const planId = payload.planId;
  const context = payload.requiredWalletContext;
  const handoff = payload.walletRequest;
  if (typeof planId !== "string" || !planId || !isRecord(context) || typeof context.account !== "string" || typeof context.chainId !== "string" ||
    !isRecord(handoff) || handoff.method !== "eth_sendTransaction" || !Array.isArray(handoff.params) || !isRecord(handoff.params[0])) {
    throw new Error("The purchase result does not contain a valid reviewed wallet request");
  }
  const request = handoff.params[0];
  if (typeof request.from !== "string" || request.from.toLowerCase() !== context.account.toLowerCase() ||
    typeof request.to !== "string" || typeof request.value !== "string" || typeof request.data !== "string" ||
    typeof request.gas !== "string" || typeof request.gasPrice !== "string") {
    throw new Error("The wallet request does not match its reviewed account or lacks required transaction fields");
  }
  if (context.chainId.toLowerCase() !== "0x38") throw new Error("The reviewed request is not bound to BSC chain 56");
  return { planId, account: context.account, chainId: "0x38", request: request as ExactWalletRequest };
}

function getHash(value: unknown): string | undefined {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value) ? value : undefined;
}

/**
 * Called only from the panel's explicit button click. The server atomically
 * claims the unchanged plan before the selected wallet is asked to submit the request.
 */
export async function runPurchaseWalletHandoff(
  preparedPayload: JsonRecord,
  provider: Eip1193WalletProvider,
  callServerTool: ServerToolCaller
): Promise<{ txHash: string; registration: JsonRecord; reconciliation?: JsonRecord; walletContextMatches: boolean; registered: boolean }> {
  if (!isRecord(preparedPayload.outcome) || preparedPayload.outcome.status !== "success") {
    throw new Error(typeof preparedPayload.summary === "string" ? preparedPayload.summary : "Purchase plan is not ready for wallet review");
  }
  const prepared = getWalletRequest(preparedPayload);
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || !accounts.some((candidate) => typeof candidate === "string" && candidate.toLowerCase() === prepared.account.toLowerCase())) {
    throw new Error("The connected wallet account does not match this plan. Select the reviewed account in your wallet; no transaction was requested.");
  }
  const activeChainId = await provider.request({ method: "eth_chainId" });
  if (typeof activeChainId !== "string" || !/^0x[0-9a-fA-F]+$/.test(activeChainId) || BigInt(activeChainId) !== 56n) {
    throw new Error("The connected wallet is not on BSC chain 56. Switch to BSC in your wallet and start this review again; no attempt was reserved.");
  }
  const claim = parseToolPayload(await callServerTool({
    name: "claim_stock_purchase_wallet_submission",
    arguments: { planId: prepared.planId, walletRequest: prepared.request }
  }));
  if (!isRecord(claim.outcome) || claim.outcome.status !== "success") {
    throw new Error(typeof claim.summary === "string" ? claim.summary : "The purchase request could not be reserved safely");
  }
  const claimRequest = getWalletRequest(claim);
  if (claimRequest.planId !== prepared.planId || claimRequest.account.toLowerCase() !== prepared.account.toLowerCase() ||
    claimRequest.chainId.toLowerCase() !== prepared.chainId.toLowerCase() || JSON.stringify(claimRequest.request) !== JSON.stringify(prepared.request)) {
    throw new Error("The server's reserved request differs from the reviewed panel request; the wallet was not called");
  }

  let walletHash: unknown;
  try {
    if (claimRequest.request.from.toLowerCase() !== prepared.account.toLowerCase()) {
      throw new Error("The server's transaction sender does not match the reviewed wallet; no transaction was requested");
    }
    const [accountsAtSend, chainAtSend] = await Promise.all([
      provider.request({ method: "eth_accounts" }),
      provider.request({ method: "eth_chainId" })
    ]);
    if (!Array.isArray(accountsAtSend) || !accountsAtSend.some((candidate) => typeof candidate === "string" && candidate.toLowerCase() === prepared.account.toLowerCase())) {
      throw new Error("The wallet account changed after preflight; no transaction was requested. The reserved attempt is closed.");
    }
    if (typeof chainAtSend !== "string" || !/^0x[0-9a-fA-F]+$/.test(chainAtSend) || BigInt(chainAtSend) !== 56n) {
      throw new Error("The wallet chain changed after preflight; no transaction was requested. The reserved attempt is closed.");
    }
    walletHash = await provider.request({ method: "eth_sendTransaction", params: [claimRequest.request] });
  } catch (error) {
    throw new WalletHandoffError(error instanceof Error ? error.message : "Wallet connection or review did not complete", undefined, true);
  }
  const txHash = getHash(walletHash);
  if (!txHash) throw new WalletHandoffError("The wallet did not return a transaction hash. Do not retry this plan; inspect the wallet's activity first.", undefined, true);

  const walletContextMatches = accounts.some((account) => typeof account === "string" && account.toLowerCase() === prepared.account.toLowerCase()) &&
    typeof activeChainId === "string" && activeChainId.toLowerCase() === prepared.chainId.toLowerCase();
  let registration: JsonRecord;
  try {
    registration = parseToolPayload(await callServerTool({
      name: "register_stock_purchase_wallet_hash",
      arguments: { planId: prepared.planId, txHash }
    }));
  } catch (error) {
    throw new WalletHandoffError(`Wallet returned ${txHash}, but Ariadne could not register it: ${error instanceof Error ? error.message : String(error)}`, txHash, true);
  }
  if (isRecord(registration.outcome) && registration.outcome.status === "error") {
    return { txHash, registration, walletContextMatches, registered: false };
  }
  let reconciliation: JsonRecord;
  try {
    reconciliation = parseToolPayload(await callServerTool({
      name: "reconcile_stock_purchase",
      arguments: { planId: prepared.planId, txHash, maxPollAttempts: 1, pollIntervalMs: 0 }
    }));
  } catch (error) {
    throw new WalletHandoffError(`Wallet hash ${txHash} is registered, but reconciliation could not complete: ${error instanceof Error ? error.message : String(error)}`, txHash, true, true);
  }
  return { txHash, registration, reconciliation, walletContextMatches, registered: true };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]!);
}

function shortAddress(value: unknown): string {
  if (typeof value !== "string") return "Unavailable";
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function tokenLine(token: unknown): string {
  if (!isRecord(token)) return "Unverified token";
  const label = typeof token.symbol === "string" ? token.symbol : typeof token.tokenSymbol === "string" ? token.tokenSymbol : "Token";
  const address = token.address ?? token.contractAddress ?? token.tokenAddress;
  const decimals = token.decimals;
  return `${label} · ${typeof address === "string" ? address : "contract unavailable"}${typeof decimals === "number" ? ` · ${decimals} decimals` : ""}`;
}

function displayBaseAmount(value: unknown, token: unknown): string {
  if (typeof value !== "string" || !/^\d+$/.test(value) || !isRecord(token) || typeof token.decimals !== "number" ||
    !Number.isInteger(token.decimals) || token.decimals < 0 || token.decimals > 255) return String(value ?? "Unavailable");
  const digits = BigInt(value).toString().padStart(token.decimals + 1, "0");
  if (token.decimals === 0) return digits;
  const whole = digits.slice(0, -token.decimals);
  const fraction = digits.slice(-token.decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function displayQuoteExpiry(value: unknown): string {
  const timestamp = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(timestamp)) return String(value ?? "Unavailable");
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export function renderPurchaseApprovalView(
  payload?: JsonRecord,
  statusMessage?: string,
  hash?: string,
  hashRegistered = false,
  submissionAttemptReserved = false,
  portalUrl?: string,
  showPortalLink = false,
  agentReportStatus?: string
): string {
  const summary = typeof payload?.summary === "string" ? payload.summary : "Waiting for a confirmed purchase request…";
  if (payload?.mode === "wallet_connection_check") {
    const connectionStatus = statusMessage ? `<p class="wallet-status" role="status">${escapeHtml(statusMessage)}</p>` : "";
    return `<main class="purchase-shell">
      <header><div class="brand"><span class="brand-mark" aria-hidden="true"></span><strong>Ariadne</strong><span>Wallet connection</span></div><span class="network-pill">BSC · 56</span></header>
      <section class="intro"><p class="eyebrow">READ-ONLY CHECK</p><h1>Connect your wallet</h1><p>${escapeHtml(summary)}</p></section>
      <aside class="security-note"><strong>No transaction will be requested.</strong> Ariadne will read only the wallet account and network, show a shortened account, then close its WalletConnect session when supported. Your wallet remains in control.</aside>
      ${connectionStatus}
      <button class="primary" id="connect-wallet-readonly" type="button">Connect wallet for read-only check</button>
      <p class="footer">This check does not request approval, sign, or broadcast.</p>
    </main>`;
  }
  const reviewed = isRecord(payload?.reviewed) ? payload.reviewed : undefined;
  const outcome = isRecord(payload?.outcome) ? payload.outcome : undefined;
  const request = isRecord(payload?.walletRequest) && Array.isArray(payload.walletRequest.params) && isRecord(payload.walletRequest.params[0])
    ? payload.walletRequest.params[0] as JsonRecord : undefined;
  const ready = outcome?.status === "success" && Boolean(request) && typeof payload?.planId === "string";
  const details = reviewed ? `
    <dl class="review-grid">
      <div><dt>Input</dt><dd>${escapeHtml(reviewed.inputAmount)} ${escapeHtml(isRecord(reviewed.inputToken) ? reviewed.inputToken.symbol : "")}</dd><small>${escapeHtml(tokenLine(reviewed.inputToken))}</small></div>
      <div><dt>Expected output</dt><dd>${escapeHtml(displayBaseAmount(reviewed.expectedOutput, reviewed.outputToken))} ${escapeHtml(isRecord(reviewed.outputToken) ? reviewed.outputToken.symbol : "")}</dd><small>Minimum ${escapeHtml(displayBaseAmount(reviewed.minimumOutput, reviewed.outputToken))} · ${escapeHtml(tokenLine(reviewed.outputToken))}</small></div>
      <div><dt>Network · representation</dt><dd>BSC · bStocks NVDA</dd><small>Chain ID 56</small></div>
      <div><dt>Wallet</dt><dd>${escapeHtml(shortAddress(isRecord(payload?.requiredWalletContext) ? payload.requiredWalletContext.account : undefined))}</dd><small>${escapeHtml(isRecord(payload?.requiredWalletContext) ? payload.requiredWalletContext.account : "Unavailable")}</small></div>
      <div><dt>Target · spender</dt><dd>Target ${escapeHtml(shortAddress(request?.to))}</dd><small>Target ${escapeHtml(request?.to)} · Spender ${escapeHtml(reviewed.spender)}</small></div>
      <div><dt>Slippage · expiry</dt><dd>${escapeHtml(reviewed.maxSlippageBps)} bps (${escapeHtml(typeof reviewed.maxSlippageBps === "number" ? (reviewed.maxSlippageBps / 100).toFixed(2) : "?")}%)</dd><small>${escapeHtml(displayQuoteExpiry(reviewed.quoteExpiresAt))}</small></div>
      <div><dt>Maximum gas</dt><dd>${escapeHtml(reviewed.maxGasCostBnb)} BNB</dd><small>Wallet confirmation shows its final fee</small></div>
    </dl>` : "";
  const blockedMessage = outcome?.status === "error" || outcome?.status === "blocked"
    ? `<p class="blocked">${escapeHtml(summary)}</p>` : "";
  const walletText = statusMessage ? `<p class="wallet-status" role="status">${escapeHtml(statusMessage)}</p>` : "";
  const hashText = hash ? `<p class="hash">Returned transaction: <code>${escapeHtml(hash)}</code></p>` : "";
  const action = ready && !hash && !submissionAttemptReserved
    ? `<p class="footnote">Ariadne will open the branded, one-time HTTPS approval page automatically. After a short introduction it asks MetaMask to show the exact transaction. You confirm only in your wallet.</p>`
    : "";
  const portalLink = portalUrl
    ? `<button class="primary portal-link" id="open-external-portal" type="button">Open the Ariadne approval page</button>`
    : "";
  const agentReport = agentReportStatus ? `<p class="footnote" id="agent-report-status">${escapeHtml(agentReportStatus)}</p>` : "";
  const retry = portalUrl ? "" : hash && hashRegistered
    ? `<button class="secondary" id="refresh-status" type="button">Refresh settlement status</button>`
    : hash
      ? `<button class="secondary" id="retry-register-hash" type="button">Retry registering the same hash</button><p class="footnote">The wallet returned this hash, but Ariadne has not confirmed registration. Do not submit again.</p>`
      : "";
  return `<main class="purchase-shell">
    <header><div class="brand"><span class="brand-mark" aria-hidden="true"></span><strong>Ariadne</strong><span>Purchase review</span></div><span class="network-pill">BSC · 56</span></header>
    <section class="intro"><p class="eyebrow">WALLET APPROVAL</p><h1>Review before you connect</h1><p>${escapeHtml(summary)}</p></section>
    ${details}
    <aside class="security-note"><strong>One request, one wallet attempt.</strong> The external page requests this exact transaction from your browser wallet. MetaMask decides whether it can process the request and remains the signer and broadcaster; Ariadne does not gate on current wallet balances or receive a private key. Its transaction hash returns through a one-time handoff for BSC receipt and balance reconciliation.</aside>
    ${blockedMessage}${walletText}${hashText}${action}${portalLink}${agentReport}${retry}
    <p class="footer">Research and transaction review only. No private key is requested or stored.</p>
  </main>`;
}

export function renderAllowanceApprovalView(payload?: JsonRecord, statusMessage?: string, portalUrl?: string, agentReportStatus?: string): string {
  const summary = typeof payload?.summary === "string" ? payload.summary : "Review the exact USDT allowance before opening MetaMask.";
  const plan = isRecord(payload?.approvalPlan) ? payload.approvalPlan : undefined;
  const inputToken = plan && isRecord(plan.inputToken) ? plan.inputToken : undefined;
  const outputToken = plan && isRecord(plan.outputToken) ? plan.outputToken : undefined;
  const market = plan && isRecord(plan.marketReview) ? plan.marketReview : undefined;
  const simulation = plan && isRecord(plan.simulation) ? plan.simulation : undefined;
  const warnings = simulation && Array.isArray(simulation.warnings) ? simulation.warnings : [];
  const isReady = isRecord(payload?.outcome) && ["success", "warning"].includes(String(payload.outcome.status)) && plan?.status === "ready_for_wallet_review";
  const rows: Array<[string, unknown, unknown?]> = [
    ["Network · asset", `BSC · ${isRecord(plan?.purchase) && isRecord(plan.purchase.asset) ? plan.purchase.asset.underlyingTicker : "stock"}`, "Chain ID 56"],
    ["Wallet", shortAddress(plan?.walletAddress), plan?.walletAddress],
    ["Approval amount", plan?.amountDisplay, inputToken ? `${inputToken.symbol} · ${inputToken.contractAddress} · ${inputToken.decimals} decimals` : "Token identity unavailable"],
    ["Allowed spender", plan?.spender, "This permission is limited to the exact amount shown above"],
    ["Maximum gas", `${escapeHtml(plan?.maxGasCostBnb)} BNB`, `Current estimate ${escapeHtml(plan?.estimatedMaxGasCostBnb)} BNB`],
    ["Market status", market?.status, "Unknown does not confirm the market is open or tradable"],
    ["Stock token", outputToken ? `${outputToken.symbol} · ${outputToken.contractAddress}` : "Unavailable", "No stock is purchased in this approval step"],
    ["Review expires", displayQuoteExpiry(plan?.expiresAt), "A fresh review is required after expiry"]
  ];
  const detailGrid = plan ? `<dl class="review-grid">${rows.map(([label, value, note]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>`).join("")}</dl>` : "";
  const fundsWarning = simulation?.walletFundsOnlyFailure === true
    ? "The provider could not verify wallet funds. This is not a successful simulation; Ariadne is letting MetaMask decide whether it can submit this exact request."
    : "";
  const warningItems = [...new Set([...(fundsWarning ? [fundsWarning] : []), ...warnings.filter((warning): warning is string => typeof warning === "string")])];
  const warningText = warningItems.length ? `<aside class="budget-note"><strong>Review note:</strong> ${warningItems.map(escapeHtml).join(" ")}</aside>` : "";
  const blocked = !isReady ? `<p class="blocked">${escapeHtml(summary)}</p>` : "";
  const action = isReady && !portalUrl ? `<p class="blocked">The wallet page link was not prepared, so there is nothing to open. Refresh the allowance plan before retrying.</p>` : "";
  const portalLink = portalUrl ? `<button class="primary portal-link" id="open-external-portal" type="button">Open MetaMask approval page</button>` : "";
  const status = statusMessage ? `<p class="wallet-status" role="status">${escapeHtml(statusMessage)}</p>` : "";
  const report = agentReportStatus ? `<p class="footnote" id="agent-report-status">${escapeHtml(agentReportStatus)}</p>` : "";
  return `<main class="purchase-shell">
    <header><div class="brand"><span class="brand-mark" aria-hidden="true"></span><strong>Ariadne</strong><span>USDT allowance</span></div><span class="network-pill">BSC · 56</span></header>
    <section class="intro"><p class="eyebrow">STEP 1 · TOKEN PERMISSION</p><h1>Review this USDT approval</h1><p>${escapeHtml(summary)}</p></section>
    ${detailGrid}
    <aside class="security-note"><strong>This does not buy the stock.</strong> It allows the named BSC spender to use only the USDT amount above. After the approval is finalized, Ariadne checks the allowance again and fetches a new price and purchase plan. The stock purchase needs its own review and MetaMask confirmation.</aside>
    ${warningText}${blocked}${status}${action}${portalLink}${report}
    <p class="footer">Ariadne never asks for a private key or recovery phrase. Review the token, amount, spender and network fee in MetaMask before confirming.</p>
  </main>`;
}

export function renderWalletConnectPrompt(qrDataUrl?: string, pending = false): string {
  if (!qrDataUrl && !pending) return "";
  return `<section class="walletconnect-prompt" role="dialog" aria-label="Connect a BSC wallet">
    ${qrDataUrl ? `<img src="${escapeHtml(qrDataUrl)}" alt="WalletConnect QR code for this BSC wallet session" width="200" height="200">` : `<div class="walletconnect-spinner" aria-hidden="true"></div>`}
    <div><strong>${qrDataUrl ? "Connect your wallet" : "Connecting securely"}</strong><p>${qrDataUrl ? "Scan with a WalletConnect-compatible wallet. Pairing connects the wallet to this BSC review; it does not send a transaction." : "Preparing a WalletConnect session. No wallet request or transaction has been sent."}</p><button class="secondary" id="cancel-wallet-connect" type="button">Cancel connection</button></div>
  </section>`;
}
