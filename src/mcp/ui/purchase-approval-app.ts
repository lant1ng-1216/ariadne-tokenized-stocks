import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables
} from "@modelcontextprotocol/ext-apps/app-with-deps";
import {
  parseToolPayload,
  requireStableWalletConnectOrigin,
  requireSupportedWalletOpenUrl,
  renderWalletConnectPrompt,
  renderPurchaseApprovalView,
  renderAllowanceApprovalView,
  renderPurchasePlanMonitorView,
  readOnlyWalletConnection,
  formatAgentAllowanceReportMessage,
  formatAgentSettlementReportMessage,
  type Eip1193WalletProvider,
  type JsonRecord
} from "./purchase-approval-flow.js";
import { selectEip1193Provider, type AnnouncedEip1193Provider } from "./eip1193-discovery.js";
import { connectWalletConnectProvider } from "./walletconnect-provider.js";
import QRCode from "qrcode";

type HostContext = Parameters<NonNullable<App["onhostcontextchanged"]>>[0];
type WalletWindow = Window & {
  ethereum?: Eip1193WalletProvider & { isMetaMask?: boolean; providers?: Array<Eip1193WalletProvider & { isMetaMask?: boolean }> };
  ariadneWalletBridge?: { provider?: Eip1193WalletProvider };
  ariadneConfig?: { reownProjectId?: string };
};

const root = document.querySelector<HTMLElement>("#app") ?? (() => {
  throw new Error("Ariadne purchase approval panel mount point is missing");
})();
const app = new App({ name: "Ariadne Purchase Approval", version: "1.0.0" }, {}, { autoResize: true });
let currentPayload: JsonRecord | undefined;
let currentHash: string | undefined;
let currentHashRegistered = false;
let currentStatus = "";
let isSubmitting = false;
let submissionAttemptReserved = false;
let externalHandoffId: string | undefined;
let walletOpenUrl: string | undefined;
let showExternalPortalLink = false;
let isOpeningExternalPortal = false;
let agentReportStatus = "";
let handoffStarted = false;
let appConnected = false;
let reportedHandoffId: string | undefined;
let walletConnectQrDataUrl: string | undefined;
let cancelWalletConnect: (() => void) | undefined;
let walletConnectAttempt = 0;
let activeWalletConnectAttempt: number | undefined;
let walletConnectCleanupWarning = "";

function applyHostContext(context: HostContext) {
  if (context.theme) applyDocumentTheme(context.theme);
  if (context.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
  const insets = context.safeAreaInsets;
  if (insets) {
    for (const edge of ["top", "right", "bottom", "left"] as const) {
      const value = insets[edge];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        document.documentElement.style.setProperty(`--host-safe-area-${edge}`, `${value}px`);
      }
    }
  }
}

function render() {
  const allowanceReview = currentPayload?.mode === "allowance_approval_review";
  const purchasePlanMonitor = currentPayload?.mode === "purchase_plan_review_monitor";
  root.innerHTML = purchasePlanMonitor
    ? renderPurchasePlanMonitorView(currentPayload, currentStatus, currentHash, agentReportStatus)
    : allowanceReview
    ? renderAllowanceApprovalView(currentPayload, currentStatus, walletOpenUrl, agentReportStatus)
    : renderPurchaseApprovalView(currentPayload, currentStatus, currentHash, currentHashRegistered, submissionAttemptReserved,
      walletOpenUrl, showExternalPortalLink, agentReportStatus)
      + renderWalletConnectPrompt(walletConnectQrDataUrl, Boolean(cancelWalletConnect));
  const readOnlyConnectButton = root.querySelector<HTMLButtonElement>("#connect-wallet-readonly");
  if (readOnlyConnectButton) {
    readOnlyConnectButton.disabled = isSubmitting;
    readOnlyConnectButton.textContent = isSubmitting ? "Connecting wallet…" : "Connect wallet for read-only check";
    readOnlyConnectButton.addEventListener("click", () => { void runReadOnlyWalletCheck(); }, { once: true });
  }
  const openPortalButton = root.querySelector<HTMLButtonElement>("#open-external-portal");
  if (openPortalButton) {
    openPortalButton.disabled = isOpeningExternalPortal;
    openPortalButton.textContent = isOpeningExternalPortal ? "Opening the wallet page…" : openPortalButton.textContent;
    openPortalButton.addEventListener("click", () => { void requestWalletPageOpen(); }, { once: true });
  }
  root.querySelector<HTMLButtonElement>("#cancel-wallet-connect")?.addEventListener("click", () => {
    cancelWalletConnect?.();
  }, { once: true });
}

async function requestWalletPageOpen() {
  const url = walletOpenUrl;
  if (!url || isOpeningExternalPortal) return;
  if (!app.getHostCapabilities()?.openLinks) {
    currentStatus = "This Agent host does not support opening external pages. The wallet page has not been opened.";
    render();
    return;
  }

  isOpeningExternalPortal = true;
  currentStatus = "Requesting the system browser to open this exact one-time wallet page…";
  let openRequest: ReturnType<App["openLink"]>;
  try {
    // Call the host-mediated open action directly from the user's click. Raw
    // target=_blank navigation is unreliable inside sandboxed MCP App views.
    openRequest = app.openLink({ url });
  } catch (error) {
    isOpeningExternalPortal = false;
    currentStatus = `The Agent could not request the wallet page to open: ${error instanceof Error ? error.message : String(error)}.`;
    render();
    return;
  }
  render();
  try {
    const result = await openRequest;
    if (result.isError) {
        currentStatus = "The Agent host rejected the request to open the system-browser launcher. The wallet page did not load, and no wallet prompt was verified.";
    } else if (externalHandoffId && currentPayload?.mode === "allowance_approval_review") {
      currentStatus = "The Agent accepted the browser-open request. Checking whether the wallet page actually loaded…";
      render();
      await waitForAllowancePageOpen(externalHandoffId);
      return;
    } else {
      currentStatus = "The Agent accepted the browser-open request. This response alone does not confirm that the wallet page loaded.";
    }
  } catch (error) {
    currentStatus = `The Agent did not complete the browser-open request: ${error instanceof Error ? error.message : String(error)}.`;
  } finally {
    isOpeningExternalPortal = false;
    render();
  }
}

async function waitForAllowancePageOpen(handoffId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const result = parseToolPayload(await app.callServerTool({
        name: "reconcile_external_stock_allowance_handoff",
        arguments: { handoffId }
      }));
      const snapshot = result.snapshot as JsonRecord | undefined;
      if (snapshot?.pageOpenedAt !== undefined) {
        showExternalPortalLink = false;
        currentStatus = "The wallet page loaded successfully. Waiting for the MetaMask approval window…";
        render();
        void monitorExternalAllowanceHandoff(handoffId);
        return;
      }
      if (isTerminalHandoffState(snapshot?.state)) {
        currentStatus = typeof snapshot.walletError === "string"
          ? `The wallet handoff ended before the page opened: ${snapshot.walletError}`
          : `The wallet handoff expired before its page loaded. No page load was confirmed.`;
        render();
        return;
      }
    } catch (error) {
      currentStatus = `The host accepted the open request, but Ariadne could not verify page loading: ${error instanceof Error ? error.message : String(error)}.`;
      render();
      return;
    }
    await wait(1_000);
  }
  currentStatus = "The host accepted the open request, but the wallet page did not contact Ariadne within 10 seconds. The page is not confirmed open, and MetaMask was not confirmed to have received a request.";
  render();
}

async function discoverWalletProvider(): Promise<Eip1193WalletProvider> {
  const walletWindow = window as WalletWindow;
  const injected = walletWindow.ethereum;
  const hostBridgeProvider = walletWindow.ariadneWalletBridge?.provider;
  if (hostBridgeProvider && typeof hostBridgeProvider.request === "function") return hostBridgeProvider;
  const providerOptions = {
    injectedProvider: injected,
    injectedProviders: injected?.providers
  };

  const selection = await new Promise<ReturnType<typeof selectEip1193Provider>>((resolve) => {
    const announcements: AnnouncedEip1193Provider[] = [];
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<AnnouncedEip1193Provider>).detail;
      if (detail?.provider) announcements.push(detail);
    };
    window.addEventListener("eip6963:announceProvider", listener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", listener);
      resolve(selectEip1193Provider({ ...providerOptions, hostBridgeProvider, announcements }));
    }, 180);
  });
  if (selection.status === "selected") return selection.provider;

  const projectId = (window as WalletWindow).ariadneConfig?.reownProjectId;
  if (!projectId) {
    if (selection.status === "ambiguous") {
      throw new Error(`Multiple distinct wallets are exposed by this Agent host (${selection.candidateCount} providers). Ariadne will not choose one automatically. Expose one wallet through the host bridge or configure a supported WalletConnect origin.`);
    }
    throw new Error("No wallet is exposed by this Agent host and in-panel WalletConnect is not configured. Set ARIADNE_REOWN_PROJECT_ID on the Ariadne MCP server, then reload the host.");
  }
  let appUrl: string;
  try {
    appUrl = requireStableWalletConnectOrigin(window.location.origin);
  } catch (error) {
    if (selection.status === "ambiguous") {
      const originReason = error instanceof Error ? error.message : "the WalletConnect app origin is unsupported";
      throw new Error(`Multiple distinct wallets are exposed by this Agent host (${selection.candidateCount} providers), so Ariadne did not choose one. The WalletConnect fallback is also unavailable: ${originReason}`);
    }
    throw error;
  }
  const attempt = ++walletConnectAttempt;
  activeWalletConnectAttempt = attempt;
  walletConnectCleanupWarning = "";
  try {
    return await connectWalletConnectProvider(projectId, appUrl, (state) => {
      if (state.cleanupWarning) {
        if (attempt !== walletConnectAttempt) return;
        walletConnectCleanupWarning = state.cleanupWarning;
        currentStatus = state.cleanupWarning;
        render();
        return;
      }
      if (attempt !== walletConnectAttempt || activeWalletConnectAttempt !== attempt) return;
      cancelWalletConnect = state.cancel;
      currentStatus = state.uri
        ? "Scan the QR code with your wallet to connect to BSC. No transaction is sent during pairing."
        : "Connecting securely to WalletConnect. You can cancel while the relay starts.";
      render();
      if (state.uri) void QRCode.toDataURL(state.uri, { errorCorrectionLevel: "M", margin: 1, width: 240 })
        .then((dataUrl) => {
          if (attempt !== walletConnectAttempt || activeWalletConnectAttempt !== attempt) return;
          walletConnectQrDataUrl = dataUrl;
          render();
        })
        .catch(() => {
          if (attempt !== walletConnectAttempt || activeWalletConnectAttempt !== attempt) return;
          cancelWalletConnect?.();
          currentStatus = "A wallet pairing code could not be displayed. No transaction was sent.";
          render();
        });
    });
  } finally {
    if (activeWalletConnectAttempt === attempt) {
      activeWalletConnectAttempt = undefined;
      walletConnectQrDataUrl = undefined;
      cancelWalletConnect = undefined;
      render();
    }
  }
}

function shortAccount(account: string): string {
  return `${account.slice(0, 6)}…${account.slice(-4)}`;
}

async function runReadOnlyWalletCheck() {
  if (isSubmitting) return;
  isSubmitting = true;
  currentStatus = "Connecting to the wallet. Ariadne will only read the account and BSC network.";
  render();
  let provider: Eip1193WalletProvider | undefined;
  try {
    provider = await discoverWalletProvider();
    const connection = await readOnlyWalletConnection(provider);
    currentStatus = `Read-only check passed: ${shortAccount(connection.account)} on BSC (56). No transaction was requested.`;
  } catch (error) {
    currentStatus = `${error instanceof Error ? error.message : "Wallet connection check failed"} No transaction was requested.`;
  } finally {
    try {
      await provider?.closeSession?.();
    } catch {
      currentStatus += " WalletConnect could not disconnect cleanly; revoke the Ariadne session in your wallet before retrying.";
    }
    isSubmitting = false;
    render();
  }
}

function isTerminalHandoffState(value: unknown): value is string {
  return ["confirmed", "failed", "wallet_rejected", "wallet_uncertain", "expired"].includes(String(value));
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function maybeStartExternalHandoff() {
  if (!appConnected || handoffStarted || !currentPayload || currentPayload.mode === "wallet_connection_check") return;
  if (currentPayload.mode === "purchase_plan_review_monitor") {
    if (typeof currentPayload.handoffId === "string" &&
      ["success", "warning"].includes(String((currentPayload.outcome as JsonRecord | undefined)?.status))) {
      externalHandoffId = currentPayload.handoffId;
      handoffStarted = true;
      currentStatus = currentPayload.language === "zh-CN"
        ? "计划链接已准备好。Ariadne 将在你自行打开页面后登记钱包返回的哈希，并核验 BSC 最终性与余额变化。"
        : "The plan link is ready. After you open it, Ariadne will register the wallet hash and verify BSC finality and balance changes.";
      render();
      void monitorExternalHandoff(externalHandoffId);
    }
    return;
  }
  if (currentPayload.mode === "allowance_approval_review") {
    if (typeof currentPayload.handoffId === "string" && typeof currentPayload.browserOpenUrl === "string" &&
      ["success", "warning"].includes(String((currentPayload.outcome as JsonRecord | undefined)?.status))) {
      externalHandoffId = currentPayload.handoffId;
      try {
        walletOpenUrl = requireSupportedWalletOpenUrl(currentPayload.browserOpenUrl);
        showExternalPortalLink = true;
        handoffStarted = true;
        void requestWalletPageOpen();
      } catch (error) {
        currentStatus = `Ariadne received an invalid wallet page link: ${error instanceof Error ? error.message : String(error)}.`;
        render();
      }
    }
    return;
  }
  if (typeof currentPayload.planId !== "string" || (currentPayload.outcome as JsonRecord | undefined)?.status !== "success") return;
  handoffStarted = true;
  void startExternalHandoff();
}

async function monitorExternalAllowanceHandoff(handoffId: string) {
  let failedReads = 0;
  for (let read = 0; read < 1_200; read += 1) {
    try {
      const result = parseToolPayload(await app.callServerTool({
        name: "reconcile_external_stock_allowance_handoff",
        arguments: { handoffId }
      }));
      const snapshot = result.snapshot as JsonRecord | undefined;
      const reconciliation = result.reconciliation as JsonRecord | undefined;
      failedReads = 0;
      if (typeof snapshot?.txHash === "string") currentHash = snapshot.txHash;
      if (snapshot?.state === "submitted") {
        currentStatus = reconciliation?.status === "pending"
          ? "MetaMask returned the allowance transaction hash. Ariadne is checking BSC finality; the stock has not been purchased."
          : "The allowance transaction was sent by MetaMask. Ariadne is verifying the same transaction; do not send again.";
        render();
      }
      if (isTerminalHandoffState(snapshot?.state)) {
        const success = snapshot.state === "confirmed" && reconciliation?.allowanceFinalized === true;
        currentHashRegistered = typeof snapshot.txHash === "string";
        const followUpHandoffId = typeof reconciliation?.followUpHandoffId === "string" ? reconciliation.followUpHandoffId : undefined;
        if (success && followUpHandoffId) {
          currentStatus = "USDT allowance finalized. The same wallet page is now presenting a separate stock-purchase confirmation in MetaMask; waiting for that result before reporting the purchase. The stock is not bought until it settles on BSC.";
          render();
          await monitorExternalHandoff(followUpHandoffId);
          return;
        }
        currentStatus = success
          ? `USDT allowance finalized, but Ariadne stopped before stock purchase: ${String(reconciliation?.reason ?? "the refreshed plan did not meet its confirmed limits")}.`
          : typeof snapshot.resultSummary === "string" ? snapshot.resultSummary
            : typeof snapshot.walletError === "string" ? snapshot.walletError
              : `The allowance flow ended as ${String(snapshot.state)}; no stock purchase is reported.`;
        render();
        await triggerAgentAllowanceReport(handoffId, snapshot, reconciliation, success);
        return;
      }
      if ((result.outcome as JsonRecord | undefined)?.status === "error") throw new Error(String(result.summary ?? "Allowance status read failed"));
    } catch (error) {
      failedReads += 1;
      currentStatus = failedReads < 4
        ? `Allowance status service is temporarily unavailable; Ariadne is retrying the same handoff. ${error instanceof Error ? error.message : ""}`
        : "Ariadne cannot currently reach the allowance status service. Keep the wallet page open; the request will not be repeated.";
      render();
    }
    await wait(2_500);
  }
  currentStatus = "Automatic allowance status checking timed out. Keep this handoff and transaction hash; do not send the request again.";
  render();
}

async function triggerAgentAllowanceReport(handoffId: string, snapshot: JsonRecord, reconciliation: JsonRecord | undefined, success: boolean) {
  if (reportedHandoffId === handoffId) return;
  reportedHandoffId = handoffId;
  const report = {
    source: "Ariadne automatic USDT allowance monitor",
    result: success ? "allowance_finalized_purchase_not_started" : snapshot.state,
    allowanceFinalized: success,
    handoffId,
    approvalPlanId: snapshot.planId,
    wallet: snapshot.account,
    token: (snapshot.display as JsonRecord | undefined)?.inputSymbol,
    amount: (snapshot.display as JsonRecord | undefined)?.inputAmount,
    spender: (snapshot.display as JsonRecord | undefined)?.spender,
    txHash: snapshot.txHash ?? null,
    allowance: reconciliation?.allowance ?? null,
    inputBalance: reconciliation?.inputBalance ?? null,
    purchaseFollowUpStatus: reconciliation?.purchaseFollowUpStatus ?? "not_started",
    refreshedPlan: reconciliation?.freshPlan ? "prepared but not eligible for automatic continuation" : null,
    noStockPurchased: true,
    reason: reconciliation?.reason ?? snapshot.resultSummary ?? null
  };
  const modelContext = `Ariadne finished monitoring the USDT allowance. This is not a stock purchase. Do not say the stock was bought. If purchaseFollowUpStatus is blocked_by_plan_boundary, explain the specific reason and that no purchase request was started.\n${JSON.stringify(report, null, 2)}`;
  const capabilities = app.getHostCapabilities();
  try {
    if (capabilities?.updateModelContext?.text) await app.updateModelContext({ content: [{ type: "text", text: modelContext }] });
    if (capabilities?.message?.text) {
      const message = await app.sendMessage({
        role: "user",
        content: [{ type: "text", text: formatAgentAllowanceReportMessage(report) }]
      });
      if (message.isError === true) throw new Error("The Agent host rejected the automatic allowance report");
      agentReportStatus = "Ariadne sent the verified allowance result and fresh quote status to this Agent conversation.";
    } else {
      agentReportStatus = "This Agent host does not advertise automatic conversation follow-up. The verified allowance result and fresh plan are shown here as model context.";
    }
  } catch (error) {
    agentReportStatus = `The allowance result is verified, but this Agent host did not accept an automatic report: ${error instanceof Error ? error.message : "host message unavailable"}`;
  }
  render();
}

async function startExternalHandoff() {
  if (!currentPayload || typeof currentPayload.planId !== "string") return;
  isSubmitting = true;
  currentStatus = "Preparing Ariadne's one-time wallet page and rechecking the exact plan…";
  render();
  try {
    const handoff = parseToolPayload(await app.callServerTool({
      name: "create_external_stock_purchase_handoff",
      arguments: { planId: currentPayload.planId }
    }));
    if ((handoff.outcome as JsonRecord | undefined)?.status !== "success") {
      throw new Error(typeof handoff.summary === "string" ? handoff.summary : "Ariadne could not prepare the external wallet handoff");
    }
    if (typeof handoff.handoffId !== "string" || typeof handoff.browserOpenUrl !== "string") throw new Error("The wallet handoff response is missing its one-time browser link");
    const supportedOpenUrl = requireSupportedWalletOpenUrl(handoff.browserOpenUrl);
    externalHandoffId = handoff.handoffId;
    walletOpenUrl = supportedOpenUrl;
    submissionAttemptReserved = true;
    showExternalPortalLink = true;
    currentStatus = "The wallet page is ready. If it did not open automatically, use the button below. Review the exact request in MetaMask.";
    render();

    if (app.getHostCapabilities()?.openLinks) {
      try {
        await app.openLink({ url: walletOpenUrl });
      } catch {
        currentStatus = "The wallet page did not open automatically. Use the button below to open this same approval request.";
      }
    } else {
      currentStatus = "This Agent host cannot open the wallet page automatically. Use the button below to open this same approval request.";
    }
    render();
    await monitorExternalHandoff(externalHandoffId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "External wallet handoff could not start";
    currentStatus = `${message} No purchase is reported as successful. If a wallet attempt was reserved, inspect its activity before any further action.`;
    render();
  } finally {
    isSubmitting = false;
    render();
  }
}

async function monitorExternalHandoff(handoffId: string) {
  let failedReads = 0;
  for (let read = 0; read < 1_200; read += 1) {
    try {
      const result = parseToolPayload(await app.callServerTool({
        name: "reconcile_external_stock_purchase_handoff",
        arguments: { handoffId }
      }));
      const snapshot = result.snapshot as JsonRecord | undefined;
      const reconciliation = result.reconciliation as JsonRecord | undefined;
      failedReads = 0;
      if (typeof snapshot?.txHash === "string") currentHash = snapshot.txHash;
      if (snapshot?.state === "submitted") {
        currentStatus = reconciliation?.status === "pending"
          ? "MetaMask sent the transaction. Ariadne is checking BSC finality and wallet balance changes; do not send again."
          : "MetaMask returned a transaction hash. Ariadne is checking the exact BSC transaction; do not send again.";
        render();
      }
      if (isTerminalHandoffState(snapshot?.state)) {
        const success = snapshot.state === "confirmed" && reconciliation?.success === true;
        currentHashRegistered = typeof snapshot.txHash === "string";
        currentStatus = success
          ? "Purchase confirmed: BSC finality and before/after wallet balances match the reviewed plan."
          : typeof snapshot.resultSummary === "string" ? snapshot.resultSummary
            : typeof snapshot.walletError === "string" ? snapshot.walletError
              : `The purchase flow ended as ${String(snapshot.state)}; no successful settlement was verified.`;
        render();
        await triggerAgentSettlementReport(handoffId, snapshot, reconciliation, success);
        return;
      }
      if ((result.outcome as JsonRecord | undefined)?.status === "error") throw new Error(String(result.summary ?? "Settlement status read failed"));
    } catch (error) {
      failedReads += 1;
      currentStatus = failedReads < 4
        ? `Status service is temporarily unavailable; Ariadne is retrying the same handoff. ${error instanceof Error ? error.message : ""}`
        : "Ariadne cannot currently reach the status service. Keep the page open; the wallet request will not be repeated.";
      render();
    }
    await wait(2_500);
  }
  currentStatus = "The automatic status check timed out. The handoff ID and reserved transaction remain unchanged; refresh status later without sending again.";
  render();
}

async function triggerAgentSettlementReport(handoffId: string, snapshot: JsonRecord, reconciliation: JsonRecord | undefined, success: boolean) {
  if (reportedHandoffId === handoffId) return;
  reportedHandoffId = handoffId;
  const display = snapshot.display as JsonRecord | undefined;
  const before = reconciliation?.before as JsonRecord | undefined;
  const after = reconciliation?.after as JsonRecord | undefined;
  const changes = reconciliation?.changes as JsonRecord | undefined;
  const report = {
    source: "Ariadne automatic settlement monitor",
    result: success ? "confirmed_success" : snapshot.state,
    success,
    terminal: true,
    planId: snapshot.planId,
    representation: `${String(display?.issuer ?? "unknown issuer")} ${String(display?.ticker ?? "")}`.trim(),
    input: `${String(display?.inputAmount ?? "")} ${String(display?.inputSymbol ?? "")}`.trim(),
    expectedOutput: `${String(display?.expectedOutput ?? "")} ${String(display?.outputSymbol ?? "")}`.trim(),
    minimumOutput: `${String(display?.minimumOutput ?? "")} ${String(display?.outputSymbol ?? "")}`.trim(),
    txHash: snapshot.txHash ?? null,
    transactionSubmitted: typeof snapshot.txHash === "string",
    lastClientStage: snapshot.clientStage ?? null,
    lastClientStageAt: snapshot.clientStageAt ?? null,
    failureReason: snapshot.resultSummary ?? snapshot.walletError ?? reconciliation?.reason ?? null,
    fundsChanged: success ? true : reconciliation?.fundsChanged ?? (snapshot.txHash ? "unverified" : false),
    nextAction: success
      ? "Verify the exact BscScan transaction and display the verified output token in MetaMask if desired."
      : snapshot.txHash
        ? "Inspect this exact transaction hash; do not submit the purchase again."
        : "Resolve the reported stage and prepare a fresh execution attempt from the preserved plan; no transaction was submitted.",
    finalizedReceipt: reconciliation?.receipt ?? null,
    balanceBefore: before ? { input: before.inputBalance, output: before.outputBalance } : null,
    balanceAfter: after ? { input: after.inputBalance, output: after.outputBalance } : null,
    balanceChanges: changes ?? null,
    warnings: reconciliation?.mismatches ?? []
  };
  const modelContext = `Ariadne has completed monitoring one BSC stock-purchase handoff. These are the machine-verified facts; do not claim success unless result is confirmed_success and success is true.\n${JSON.stringify(report, null, 2)}`;
  const capabilities = app.getHostCapabilities();
  let reportClaimed = false;
  let delivered = false;
  try {
    const claim = parseToolPayload(await app.callServerTool({
      name: "claim_external_stock_purchase_report",
      arguments: { handoffId }
    }));
    if (claim.claimed !== true) {
      agentReportStatus = claim.status === "delivered"
        ? "This verified result was already reported to the Agent conversation."
        : "Another active Ariadne monitor is reporting this verified result.";
      render();
      return;
    }
    reportClaimed = true;
    if (capabilities?.updateModelContext?.text) await app.updateModelContext({ content: [{ type: "text", text: modelContext }] });
    if (capabilities?.message?.text) {
      const message = await app.sendMessage({
        role: "user",
        content: [{ type: "text", text: formatAgentSettlementReportMessage(report) }]
      });
      if (message.isError === true) throw new Error("The Agent host rejected the automatic report message");
      delivered = true;
      agentReportStatus = "Ariadne sent the verified result to this Agent conversation for a detailed report.";
    } else {
      agentReportStatus = "This Agent host does not advertise automatic conversation follow-up. The verified result is shown here and attached as model context for the next turn.";
    }
  } catch (error) {
    agentReportStatus = `The purchase result is verified, but this Agent host did not accept an automatic chat report: ${error instanceof Error ? error.message : "host message unavailable"}`;
  } finally {
    if (reportClaimed) {
      try {
        await app.callServerTool({
          name: "complete_external_stock_purchase_report",
          arguments: { handoffId, delivered }
        });
      } catch (error) {
        agentReportStatus += ` Ariadne could not persist the report-delivery marker: ${error instanceof Error ? error.message : "status unavailable"}`;
      }
    }
  }
  render();
}

app.onhostcontextchanged = applyHostContext;
app.ontoolresult = (result) => {
  try {
    currentPayload = parseToolPayload(result);
    currentHash = undefined;
    currentHashRegistered = false;
    currentStatus = "";
    submissionAttemptReserved = false;
    externalHandoffId = undefined;
    walletOpenUrl = undefined;
    showExternalPortalLink = false;
    agentReportStatus = "";
    handoffStarted = false;
    reportedHandoffId = undefined;
    if (currentPayload.mode === "allowance_approval_review" &&
      typeof currentPayload.handoffId === "string" && typeof currentPayload.browserOpenUrl === "string") {
      externalHandoffId = currentPayload.handoffId;
      walletOpenUrl = requireSupportedWalletOpenUrl(currentPayload.browserOpenUrl);
      showExternalPortalLink = true;
    }
    if (currentPayload.mode === "purchase_plan_review_monitor" && typeof currentPayload.handoffId === "string") {
      externalHandoffId = currentPayload.handoffId;
    }
    render();
    maybeStartExternalHandoff();
  } catch (error) {
    currentPayload = { summary: error instanceof Error ? error.message : "Purchase review result could not be read" };
    currentStatus = "This host still has the text result in the conversation. Wallet actions are disabled until the plan is readable.";
    render();
  }
};
app.ontoolcancelled = () => {
  currentStatus = currentPayload?.mode === "wallet_connection_check"
    ? "The read-only wallet connection check was cancelled. No transaction was requested."
    : "The purchase review was cancelled. No wallet request was sent by Ariadne.";
  render();
};

app.connect().then(() => {
  appConnected = true;
  const context = app.getHostContext();
  if (context) applyHostContext(context);
  render();
  maybeStartExternalHandoff();
}).catch(() => {
  currentPayload = { summary: "This host did not complete the MCP Apps handshake." };
  currentStatus = "Ariadne's text result remains available in the conversation; this host cannot open the wallet panel.";
  render();
});
