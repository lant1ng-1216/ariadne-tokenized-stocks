import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletHandoffRelayServer } from "../src/mcp/wallet-handoff-relay-server.js";

const fixture = new Client(
  { name: "ariadne-mcp-transaction-closure-test", version: "0.1.0" },
  { capabilities: { elicitation: { form: {} } }, versionNegotiation: { mode: { pin: "2026-07-28" } } }
);
fixture.setRequestHandler("elicitation/create", async (request) => {
  assert.equal(request.params.mode, "form");
  assert.match(request.params.message, /Market status category: unknown/);
  assert.match(request.params.message, /Unknown is not confirmation that the market is open/);
  if (request.params.message.includes("Wallet sufficiency notice:")) {
    assert.match(request.params.message, /Ariadne did not check or judge the wallet balance/);
    assert.match(request.params.message, /MetaMask will decide/);
  }
  return { action: "accept", content: { decision: "approve" } };
});
const relaySecret = "deterministic-fixture-relay-secret-with-32-plus-characters";
const relayServer = await createWalletHandoffRelayServer({
  host: "127.0.0.1", port: 0, portalOrigin: "http://127.0.0.1:0", serviceSecret: relaySecret
});
const relayAddress = relayServer.server.address();
assert.ok(relayAddress && typeof relayAddress === "object");
const relayBaseUrl = `http://127.0.0.1:${relayAddress.port}`;
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", "scripts/mcp-transaction-closure-fixture-server.ts"],
  cwd: process.cwd(),
  env: {
    PATH: process.env.PATH ?? "",
    ARIADNE_TRANSPORT: "http",
    ARIADNE_WALLET_HANDOFF_RELAY_URL: relayBaseUrl,
    ARIADNE_WALLET_HANDOFF_RELAY_SECRET: relaySecret
  },
  stderr: "pipe"
});

function parseToolResult(result: { content: Array<{ type: string; text?: string }> }) {
  const text = result.content.find((item) => item.type === "text")?.text;
  assert.ok(text, "MCP tool must return a text result");
  return JSON.parse(text!);
}

async function prepareExactFixturePlan(fixtureClient: Client, walletAddress: string) {
  return parseToolResult(await fixtureClient.callTool({
    name: "prepare_bsc_stock_purchase_fixture",
    arguments: {
      walletAddress,
      amount: "1",
      maxSlippageBps: 50,
      maxGasCostBnb: "0.001",
      asset: {
        assetId: "56:0x6666666666666666666666666666666666666666",
        chainId: "56",
        platformId: "bstock",
        contractAddress: "0x6666666666666666666666666666666666666666",
        tokenSymbol: "TESTB",
        underlyingTicker: "TEST",
        underlyingName: "Synthetic Test Stock"
      }
    }
  }));
}

try {
  await fixture.connect(transport);
  assert.equal(fixture.getProtocolEra(), "modern");
  const toolList = await fixture.listTools();
  const names = toolList.tools.map(({ name }) => name);
  for (const name of [
    "prepare_bsc_stock_purchase",
    "prepare_bsc_stock_allowance_approval",
    "refresh_bsc_stock_purchase_after_approval",
    "simulate_stock_action_plan",
    "confirm_stock_action_plan",
    "broadcast_confirmed_transaction",
    "prepare_stock_purchase_wallet_request",
    "create_external_stock_purchase_handoff",
    "reconcile_external_stock_purchase_handoff",
    "create_external_stock_allowance_handoff",
    "reconcile_external_stock_allowance_handoff",
    "claim_stock_purchase_wallet_submission",
    "register_stock_purchase_wallet_hash",
    "reconcile_stock_purchase"
  ]) assert.ok(names.includes(name), `MCP fixture must expose ${name}`);
  assert.ok(names.includes("connect_bsc_wallet_readonly"), "MCP must expose a wallet connection check that does not submit a transaction");
  const readOnlyConnectionTool = toolList.tools.find(({ name }) => name === "connect_bsc_wallet_readonly");
  const readOnlyConnectionMeta = readOnlyConnectionTool?._meta as { ui?: { resourceUri?: string } } | undefined;
  assert.equal(readOnlyConnectionMeta?.ui?.resourceUri, "ui://ariadne/purchase-approval-v9.html", "read-only wallet connection must open the in-panel wallet UI");
  const purchasePlanTool = toolList.tools.find(({ name }) => name === "prepare_bsc_stock_purchase");
  const purchasePlanMeta = purchasePlanTool?._meta as { ui?: { resourceUri?: string } } | undefined;
  assert.equal(purchasePlanMeta?.ui?.resourceUri, "ui://ariadne/purchase-approval-v9.html", "plan creation must attach the background settlement monitor without replacing the native plan result");
  const readOnlyConnection = parseToolResult(await fixture.callTool({ name: "connect_bsc_wallet_readonly", arguments: {} }));
  assert.equal(readOnlyConnection.mode, "wallet_connection_check");
  assert.equal(readOnlyConnection.outcome.sideEffects, "none");
  assert.equal("walletRequest" in readOnlyConnection, false, "read-only connection tool must not return a transaction request");
  const panelTool = toolList.tools.find(({ name }) => name === "prepare_stock_purchase_wallet_request");
  const panelMeta = panelTool?._meta as { ui?: { resourceUri?: string } } | undefined;
  assert.equal(panelMeta?.ui?.resourceUri, "ui://ariadne/purchase-approval-v9.html", "wallet preparation must open the Agent-native purchase panel");
  const allowancePanelTool = toolList.tools.find(({ name }) => name === "prepare_bsc_stock_allowance_approval");
  assert.equal((allowancePanelTool?._meta as { ui?: { resourceUri?: string } } | undefined)?.ui?.resourceUri, undefined, "allowance review must use native conversation rather than the unreliable panel open-link button");
  const appOnlyClaim = toolList.tools.find(({ name }) => name === "claim_stock_purchase_wallet_submission");
  assert.deepEqual((appOnlyClaim?._meta as { ui?: { visibility?: string[] } } | undefined)?.ui?.visibility, ["app"], "the legacy direct-panel reservation tool remains app-only");
  for (const name of ["create_external_stock_purchase_handoff", "reconcile_external_stock_purchase_handoff", "create_external_stock_allowance_handoff", "reconcile_external_stock_allowance_handoff"]) {
    const appOnly = toolList.tools.find(({ name: current }) => current === name);
    assert.deepEqual((appOnly?._meta as { ui?: { visibility?: string[] } } | undefined)?.ui?.visibility, ["app"], `${name} must remain app-only`);
  }
  const appOnlyHashRegistration = toolList.tools.find(({ name }) => name === "register_stock_purchase_wallet_hash");
  assert.deepEqual((appOnlyHashRegistration?._meta as { ui?: { visibility?: string[] } } | undefined)?.ui?.visibility, ["app"], "only the wallet panel can register an external wallet's returned transaction hash");
  const panelResource = await fixture.readResource({ uri: "ui://ariadne/purchase-approval-v9.html" });
  const panelContent = panelResource.contents.find((item) => "text" in item) as {
    text: string;
    mimeType?: string;
    _meta?: {
      ui?: { domain?: string; csp?: { connectDomains?: string[]; frameDomains?: string[]; resourceDomains?: string[] } };
      "openai/widgetDomain"?: string;
    };
  } | undefined;
  assert.ok(panelContent?.text, "the linked MCP App panel resource must be readable");
  assert.equal(panelContent.mimeType, "text/html;profile=mcp-app");
  assert.deepEqual(panelContent._meta?.ui?.csp?.connectDomains, ["wss://relay.walletconnect.org", "https://verify.walletconnect.org", "https://verify.walletconnect.com"], "the WalletConnect fallback may access only its relay and verification endpoints");
  assert.equal(panelContent._meta?.ui?.domain, "https://web-sandbox.oaiusercontent.com", "the host should mount the widget at its documented stable OpenAI sandbox origin");
  assert.equal(panelContent._meta?.["openai/widgetDomain"], "https://web-sandbox.oaiusercontent.com", "the widget should also declare OpenAI's documented compatibility origin key");
  assert.deepEqual(panelContent._meta?.ui?.csp?.frameDomains, ["https://verify.walletconnect.org", "https://verify.walletconnect.com"], "WalletConnect peer verification may frame only its two official verification origins");
  assert.equal(panelContent._meta?.ui?.csp?.resourceDomains, undefined, "the bundled panel loads no remote scripts, images, or wallet catalog");
  assert.match(panelContent.text, /eip6963:requestProvider|eth_sendTransaction/);
  assert.match(panelContent.text, /WalletConnect|display_uri/);
  assert.match(panelContent.text, /create_external_stock_purchase_handoff/);
  assert.match(panelContent.text, /reconcile_external_stock_purchase_handoff/);
  assert.doesNotMatch(panelContent.text, /create_external_stock_allowance_handoff/, "the allowance panel must not wait for a second async tool call before opening the pre-created page");
  assert.match(panelContent.text, /reconcile_external_stock_allowance_handoff/);
  assert.match(panelContent.text, /Review this USDT approval/);
  assert.match(panelContent.text, /sendMessage/);

  const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
  const walletAddress = account.address;
  const emptyWalletFixture = parseToolResult(await fixture.callTool({ name: "set_test_input_balance", arguments: { balance: "0" } }));
  assert.equal(emptyWalletFixture.fixtureOnly, true);
  const purchaseIntent = parseToolResult(await fixture.callTool({
    name: "prepare_bsc_stock_purchase",
    arguments: { query: "TEST", platformId: "bstock", inputTokenSymbol: "USDT", amount: "1" }
  }));
  assert.equal(purchaseIntent.mode, "purchase_intent_review_monitor");
  assert.equal("plan" in purchaseIntent, false);
  assert.equal("walletAddress" in purchaseIntent.purchaseIntent, false);
  assert.equal(purchaseIntent.purchaseIntent.maxSlippageBps, 200);
  assert.match(purchaseIntent.handoffId, /^[a-f0-9]{32}$/);
  assert.match(purchaseIntent.browserOpenUrl, /^http:\/\/127\.0\.0\.1:\d+\/open-external\/[a-f0-9]{32}#[A-Za-z0-9_-]{40,}$/);
  const intentLinkMatch = String(purchaseIntent.walletPage.link).match(/\]\(([^)]+)\)$/);
  assert.ok(intentLinkMatch);
  const intentLink = new URL(intentLinkMatch[1]!);
  const intentHandoff = relayServer.store.readInternal(intentLink.pathname.split("/").at(-1)!);
  assert.equal(intentHandoff.reviewMode, "purchase_intent");
  assert.equal(intentHandoff.request, undefined);
  assert.equal(intentHandoff.originalPlan, undefined);
  assert.equal(intentHandoff.walletAttemptClaimedAt, undefined);
  assert.equal(intentHandoff.pageOpenedAt, undefined);

  const purchasePlan = await prepareExactFixturePlan(fixture, walletAddress);
  assert.notEqual(purchasePlan.outcome.status, "blocked", "insufficient allowance does not hide the requested purchase plan");
  assert.equal(purchasePlan.plan.status, "awaiting_confirmation");
  assert.ok(purchasePlan.plan.approvalRequired, "the exact allowance prerequisite is disclosed separately");

  const restoreBalanceForPlanReview = parseToolResult(await fixture.callTool({ name: "set_test_input_balance", arguments: { balance: "3000000000000000000" } }));
  assert.equal(restoreBalanceForPlanReview.fixtureOnly, true);
  const originalSimulation = parseToolResult(await fixture.callTool({
    name: "simulate_stock_action_plan", arguments: { plan: purchasePlan.plan }
  }));
  assert.equal(originalSimulation.broadcasted, false);
  assert.equal(originalSimulation.plan.status, "simulated");
  const originalConfirmation = parseToolResult(await fixture.callTool({
    name: "confirm_stock_action_plan", arguments: { plan: originalSimulation.plan }
  }));
  assert.equal(originalConfirmation.plan.status, "confirmed");
  assert.equal(originalConfirmation.broadcasted, false);

  const approvalPrepared = parseToolResult(await fixture.callTool({
    name: "prepare_bsc_stock_allowance_approval",
    arguments: { planId: originalConfirmation.plan.planId }
  }));
  assert.equal(approvalPrepared.approvalPlan.status, "ready_for_wallet_review");
  assert.equal(approvalPrepared.mode, "allowance_approval_review");
  assert.equal(approvalPrepared.approvalPlan.requiresUserConfirmation, true);
  assert.equal(approvalPrepared.approvalPlan.marketReview.status, "unknown");
  assert.equal(approvalPrepared.approvalPlan.marketReview.providerOpenState, true);
  assert.match(approvalPrepared.approvalPlan.marketReview.warnings.join(" "), /does not establish that the market is open or tradable/);
  assert.match(approvalPrepared.approvalPlan.simulation.warnings.join(" "), /does not establish that the market is open or tradable/);
  assert.equal(approvalPrepared.approvalPlan.unsignedTransaction.to.toLowerCase(), "0x55d398326f99059ff775485246999027b3197955");
  assert.equal(approvalPrepared.approvalPlan.unsignedTransaction.value, "0");
  assert.equal(approvalPrepared.approvalPlan.spender.toLowerCase(), "0x4444444444444444444444444444444444444444");
  assert.equal(approvalPrepared.presentationMode, "native_conversation");
  const walletLinkMatch = String(approvalPrepared.walletPageMarkdownLink).match(/^\[Open Ariadne's USDT approval page in your browser\]\(([^)]+)\)$/);
  assert.ok(walletLinkMatch, "native chat presents exactly one link with the system-browser intent");
  const preparedAllowanceUrl = new URL(walletLinkMatch[1]!);
  const preparedAllowanceId = preparedAllowanceUrl.pathname.split("/").at(-1);
  const preparedAllowanceCapability = preparedAllowanceUrl.hash.slice(1);
  assert.ok(preparedAllowanceId);
  assert.ok(preparedAllowanceCapability);
  assert.match(preparedAllowanceUrl.pathname, /^\/open-external\/[a-f0-9]{32}$/);
  assert.equal("portalUrl" in approvalPrepared, false, "the internal approval-page URL is not separately exposed as a side-panel link");
  assert.equal((String(approvalPrepared.walletPageMarkdownLink).match(/\]\(/g) ?? []).length, 1, "the response exposes one wallet-opening link only");
  assert.equal(approvalPrepared.handoffStatus, "wallet_handoff_ready", "plan preparation returns the one-time launcher link before the owner opens it");
  assert.equal(typeof approvalPrepared.walletPageExpiresAt, "number");
  assert.match(preparedAllowanceCapability, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(relayServer.store.readInternal(preparedAllowanceId).pageOpenedAt, undefined, "preparing a page is not evidence that the browser loaded it");

  const allowanceHandoff = parseToolResult(await fixture.callTool({
    name: "create_external_stock_allowance_handoff",
    arguments: { approvalPlanId: approvalPrepared.approvalPlan.approvalPlanId }
  }));
  assert.equal(allowanceHandoff.outcome.status, "success", allowanceHandoff.summary);
  assert.equal(allowanceHandoff.browserOpenUrl, walletLinkMatch[1], "the app-only handoff uses the same single external-browser entry");
  const allowanceHandoffId = preparedAllowanceId;
  const allowanceCapability = preparedAllowanceCapability;
  assert.match(allowanceHandoffId!, /^[a-f0-9]{32}$/);
  assert.match(allowanceCapability!, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(relayServer.store.portalUrlForExternalOpen(allowanceHandoffId!, allowanceCapability!), `http://127.0.0.1:0/approve#${allowanceHandoffId}.${allowanceCapability}`);
  const allowancePortalRead = await fetch(`${relayBaseUrl}/api/handoffs/${allowanceHandoffId}`, {
    headers: { authorization: `Bearer ${allowanceCapability}` }
  });
  assert.equal(allowancePortalRead.status, 200);
  const openedAllowance = await allowancePortalRead.json() as Record<string, unknown>;
  assert.equal((openedAllowance.display as Record<string, unknown>).operation, "allowance_approval");
  assert.equal(typeof openedAllowance.pageOpenedAt, "number", "only a real page API read creates the browser-loaded receipt");
  const allowanceAttempt = await fetch(`${relayBaseUrl}/api/handoffs/${allowanceHandoffId}/attempt`, {
    method: "POST",
    headers: { origin: new URL(relayBaseUrl).origin, authorization: `Bearer ${allowanceCapability}`, "content-type": "application/json" },
    body: JSON.stringify({ attemptId: "52345678-1234-4234-8234-123456789abc" })
  });
  assert.equal(allowanceAttempt.status, 200);

  const modeledApproval = parseToolResult(await fixture.callTool({
    name: "set_test_approval_receipt",
    arguments: { plan: approvalPrepared.approvalPlan }
  }));
  assert.equal(modeledApproval.fixtureOnly, true);
  assert.equal(modeledApproval.externalNetworkRequests, 0);
  assert.equal(modeledApproval.mockBroadcasts, 0);
  const allowanceWalletSubmission = await fetch(`${relayBaseUrl}/api/handoffs/${allowanceHandoffId}/submission`, {
    method: "POST",
    headers: { origin: new URL(relayBaseUrl).origin, authorization: `Bearer ${allowanceCapability}`, "content-type": "application/json" },
    body: JSON.stringify({ account: walletAddress, chainId: "0x38", txHash: `0x${"cd".repeat(32)}` })
  });
  assert.equal(allowanceWalletSubmission.status, 200);
  assert.equal((await allowanceWalletSubmission.json() as Record<string, unknown>).state, "submitted");
  const approvalRefresh = parseToolResult(await fixture.callTool({
    name: "reconcile_external_stock_allowance_handoff", arguments: { handoffId: allowanceHandoff.handoffId }
  }));
  assert.equal(approvalRefresh.approvalStatus, "ready");
  assert.equal(approvalRefresh.snapshot.state, "confirmed");
  assert.equal(approvalRefresh.reconciliation.success, true);
  assert.equal(approvalRefresh.reconciliation.purchaseFollowUpStatus, "ready");
  assert.equal(typeof approvalRefresh.reconciliation.followUpHandoffId, "string", "the exact same-page purchase confirmation is linked after allowance finality");
  assert.equal(approvalRefresh.continuationPlan.status, "confirmed", "the refreshed plan has passed local simulation and remains inside the original user-confirmed limits");
  assert.equal(approvalRefresh.freshPlan.status, "awaiting_confirmation");
  assert.equal(approvalRefresh.freshPlan.quoteId, "mcp-closure-fixture-quote");
  assert.match(approvalRefresh.snapshot.resultSummary, /Ariadne 已在同一浏览器页面准备好这份原计划对应的独立买入请求/);
  assert.equal(approvalRefresh.reconciliation.inputBalance, "3000000000000000000", "post-approval balance is reported as context, not as an Ariadne purchase gate");
  const continuationPlan = approvalRefresh.continuationPlan;
  assert.equal(continuationPlan.minimumOutput, originalConfirmation.plan.minimumOutput, "the same confirmed minimum stock amount is preserved after the fresh quote");
  const purchaseFollowUpId = approvalRefresh.reconciliation.followUpHandoffId as string;
  const purchaseFollowUp = relayServer.store.readFollowUp(allowanceHandoffId!, allowanceCapability!);
  assert.equal(purchaseFollowUp.id, purchaseFollowUpId);
  const purchasePage = relayServer.store.readInternal(purchaseFollowUp.id);
  assert.equal(purchasePage.planId, continuationPlan.planId);
  assert.equal(purchasePage.display.continuationOfPlanId, originalConfirmation.plan.planId, "the browser can compare the refreshed quote with the exact plan that preceded allowance approval");
  assert.equal(purchasePage.display.purchaseBaseline?.expectedOutput, originalConfirmation.plan.expectedOutput);
  const refreshedSwap = continuationPlan.unsignedActions[0].payload.tx;
  assert.ok(purchasePage.request, "the prepared purchase follow-up has an exact wallet request");
  assert.equal(purchasePage.request.from.toLowerCase(), walletAddress.toLowerCase());
  assert.equal(purchasePage.request.to.toLowerCase(), refreshedSwap.to.toLowerCase());
  assert.equal(purchasePage.request.data.toLowerCase(), refreshedSwap.data.toLowerCase());
  assert.equal(BigInt(purchasePage.request.value), BigInt(refreshedSwap.value));
  assert.equal(purchasePage.display.minimumOutput, "0.995", "the child wallet request displays the refreshed minimum inside the original boundary");
  relayServer.store.readPublic(purchaseFollowUp.id, purchaseFollowUp.capability);
  const childAttemptId = "62345678-1234-4234-8234-123456789abc";
  relayServer.store.claimWalletAttempt(purchaseFollowUp.id, purchaseFollowUp.capability, childAttemptId);
  const childHash = `0x${"34".repeat(32)}`;
  const fixtureWalletTransaction = parseToolResult(await fixture.callTool({
    name: "set_test_wallet_submission", arguments: { transaction: purchasePage.request, txHash: childHash }
  }));
  assert.equal(fixtureWalletTransaction.fixtureOnly, true);
  relayServer.store.submitFromWallet(purchaseFollowUp.id, purchaseFollowUp.capability, { account: walletAddress, chainId: "0x38", txHash: childHash });
  const childReconciliation = parseToolResult(await fixture.callTool({
    name: "reconcile_external_stock_purchase_handoff", arguments: { handoffId: purchaseFollowUp.id }
  }));
  assert.equal(childReconciliation.outcome.status, "success", childReconciliation.summary);
  assert.equal(childReconciliation.reconciliation.success, true);
  assert.equal(childReconciliation.reconciliation.changes.inputSpent, "1000000000000000000");
  assert.equal(childReconciliation.reconciliation.changes.outputReceived, "995000000000000000");
  assert.equal(childReconciliation.snapshot.state, "confirmed");

  const separateBroadcastPlan = await prepareExactFixturePlan(fixture, walletAddress);
  const separateSimulation = parseToolResult(await fixture.callTool({ name: "simulate_stock_action_plan", arguments: { plan: separateBroadcastPlan.plan } }));
  const separateConfirmation = parseToolResult(await fixture.callTool({ name: "confirm_stock_action_plan", arguments: { plan: separateSimulation.plan } }));
  const separateWalletReview = parseToolResult(await fixture.callTool({ name: "prepare_stock_purchase_wallet_request", arguments: { plan: separateConfirmation.plan } }));
  const unsignedTx = separateWalletReview.walletRequest.params[0];
  const signedTransaction = await account.signTransaction({
    type: "legacy", chainId: 56, to: unsignedTx.to, value: BigInt(unsignedTx.value),
    data: unsignedTx.data, nonce: 2, gas: BigInt(unsignedTx.gas), gasPrice: BigInt(unsignedTx.gasPrice)
  });
  const broadcast = parseToolResult(await fixture.callTool({
    name: "broadcast_confirmed_transaction",
    arguments: { plan: separateConfirmation.plan, signedTransaction, address: walletAddress }
  }));
  assert.equal(broadcast.signedInternally, false, JSON.stringify(broadcast));
  assert.equal(broadcast.settlement.status, "awaiting_reconciliation");
  assert.equal(broadcast.settlement.txHash, `0x${"ef".repeat(32)}`);

  const substitutedHash = parseToolResult(await fixture.callTool({
    name: "reconcile_stock_purchase",
    arguments: { planId: separateConfirmation.plan.planId, txHash: `0x${"ac".repeat(32)}`, maxPollAttempts: 1, pollIntervalMs: 0 }
  }));
  assert.equal(substitutedHash.outcome.status, "error");
  assert.match(substitutedHash.summary, /does not match the hash returned by the broadcaster/i);

  const zeroBalanceReviewPlan = await prepareExactFixturePlan(fixture, walletAddress);
  const zeroBalanceFixture = parseToolResult(await fixture.callTool({ name: "set_test_input_balance", arguments: { balance: "0" } }));
  assert.equal(zeroBalanceFixture.fixtureOnly, true);
  const walletOnlySimulationFixture = parseToolResult(await fixture.callTool({ name: "set_test_wallet_funds_simulation", arguments: {} }));
  assert.equal(walletOnlySimulationFixture.fixtureOnly, true);
  const zeroBalanceSimulation = parseToolResult(await fixture.callTool({ name: "simulate_stock_action_plan", arguments: { plan: zeroBalanceReviewPlan.plan } }));
  assert.equal(zeroBalanceSimulation.plan.status, "wallet_review", "funds-only simulation failure remains a warning, not a false simulation pass");
  assert.equal(zeroBalanceSimulation.plan.simulation.success, false);
  assert.equal(zeroBalanceSimulation.outcome.status, "warning");
  const zeroBalanceConfirmation = parseToolResult(await fixture.callTool({ name: "confirm_stock_action_plan", arguments: { plan: zeroBalanceSimulation.plan } }));
  assert.equal(zeroBalanceConfirmation.confirmationStatus, "approved");
  const zeroBalanceWalletReview = parseToolResult(await fixture.callTool({ name: "prepare_stock_purchase_wallet_request", arguments: { plan: zeroBalanceConfirmation.plan } }));
  const zeroBalancePortal = parseToolResult(await fixture.callTool({ name: "create_external_stock_purchase_handoff", arguments: { planId: zeroBalanceConfirmation.plan.planId } }));
  assert.equal(zeroBalanceWalletReview.outcome.status, "success");
  assert.equal(zeroBalancePortal.outcome.status, "success", "the user can reach the wallet page when the provider cannot confirm wallet funds");
  const restoreBalanceAfterWalletReview = parseToolResult(await fixture.callTool({ name: "set_test_input_balance", arguments: { balance: "3000000000000000000" } }));
  assert.equal(restoreBalanceAfterWalletReview.fixtureOnly, true);

  // Prove that even the portal/relay handoff opens when both wallet balances are zero.
  const emptyWalletPlan = await prepareExactFixturePlan(fixture, walletAddress);
  assert.equal(emptyWalletPlan.plan.status, "awaiting_confirmation");
  const emptyBalanceFixture = parseToolResult(await fixture.callTool({ name: "set_test_input_balance", arguments: { balance: "0" } }));
  assert.equal(emptyBalanceFixture.fixtureOnly, true);
  const emptyWalletSimulation = parseToolResult(await fixture.callTool({ name: "simulate_stock_action_plan", arguments: { plan: emptyWalletPlan.plan } }));
  const emptyWalletConfirmation = parseToolResult(await fixture.callTool({ name: "confirm_stock_action_plan", arguments: { plan: emptyWalletSimulation.plan } }));
  const emptyWalletReview = parseToolResult(await fixture.callTool({ name: "prepare_stock_purchase_wallet_request", arguments: { plan: emptyWalletConfirmation.plan } }));
  const emptyWalletHandoff = parseToolResult(await fixture.callTool({ name: "create_external_stock_purchase_handoff", arguments: { planId: emptyWalletConfirmation.plan.planId } }));
  assert.equal(emptyWalletReview.outcome.status, "success");
  assert.equal(emptyWalletHandoff.outcome.status, "success", "zero USDT and zero native balance do not block the wallet page handoff");
  const restoreBalanceAfterEmptyReview = parseToolResult(await fixture.callTool({ name: "set_test_input_balance", arguments: { balance: "2000000000000000000" } }));
  assert.equal(restoreBalanceAfterEmptyReview.fixtureOnly, true);

  const walletPlan = await prepareExactFixturePlan(fixture, walletAddress);
  assert.equal(walletPlan.plan.status, "awaiting_confirmation");
  const walletSimulation = parseToolResult(await fixture.callTool({ name: "simulate_stock_action_plan", arguments: { plan: walletPlan.plan } }));
  assert.equal(walletSimulation.plan.status, "simulated");
  const walletConfirmation = parseToolResult(await fixture.callTool({ name: "confirm_stock_action_plan", arguments: { plan: walletSimulation.plan } }));
  assert.equal(walletConfirmation.confirmationStatus, "approved");
  const walletHandoff = parseToolResult(await fixture.callTool({
    name: "prepare_stock_purchase_wallet_request", arguments: { plan: walletConfirmation.plan }
  }));
  assert.equal(walletHandoff.walletRequest.method, "eth_sendTransaction");
  assert.equal(walletHandoff.walletRequest.params[0].from.toLowerCase(), walletAddress.toLowerCase());
  assert.equal(walletHandoff.requiredWalletContext.chainId, "0x38");
  assert.equal(walletHandoff.walletRequest.params[0].to.toLowerCase(), "0x3333333333333333333333333333333333333333");
  assert.equal(walletHandoff.walletRequest.params[0].gas, "0x186a0");
  assert.equal(walletHandoff.walletRequest.params[0].gasPrice, "0x5f5e100");
  assert.equal(walletHandoff.submissionAttemptReserved, false, "displaying the review panel must not consume the one wallet attempt");
  const alteredWalletRequest = parseToolResult(await fixture.callTool({
    name: "claim_stock_purchase_wallet_submission",
    arguments: {
      planId: walletConfirmation.plan.planId,
      walletRequest: { ...walletHandoff.walletRequest.params[0], to: "0x9999999999999999999999999999999999999999" }
    }
  }));
  assert.equal(alteredWalletRequest.outcome.status, "error");
  assert.match(alteredWalletRequest.summary, /differs from the exact confirmed plan/i);
  const walletClaim = parseToolResult(await fixture.callTool({
    name: "claim_stock_purchase_wallet_submission",
    arguments: { planId: walletConfirmation.plan.planId, walletRequest: walletHandoff.walletRequest.params[0] }
  }));
  assert.equal(walletClaim.status, "wallet_submission_reserved");
  assert.equal(walletClaim.walletRequest.params[0].to, walletHandoff.walletRequest.params[0].to);
  const duplicateWalletClaim = parseToolResult(await fixture.callTool({
    name: "claim_stock_purchase_wallet_submission",
    arguments: { planId: walletConfirmation.plan.planId, walletRequest: walletHandoff.walletRequest.params[0] }
  }));
  assert.equal(duplicateWalletClaim.outcome.status, "error");
  assert.match(duplicateWalletClaim.summary, /Broadcast already attempted/i);
  const walletBroadcast = parseToolResult(await fixture.callTool({
    name: "set_test_wallet_submission", arguments: { transaction: walletClaim.walletRequest.params[0] }
  }));
  assert.equal(walletBroadcast.fixtureOnly, true);
  assert.equal(walletBroadcast.externalNetworkRequests, 0);
  const preRegisteredHashAttempt = parseToolResult(await fixture.callTool({
    name: "reconcile_stock_purchase",
    arguments: { planId: walletConfirmation.plan.planId, txHash: `0x${"ae".repeat(32)}`, maxPollAttempts: 1, pollIntervalMs: 0 }
  }));
  assert.equal(preRegisteredHashAttempt.outcome.status, "error");
  assert.match(preRegisteredHashAttempt.summary, /register the hash returned by the wallet before reconciling/i);
  const hashRegistration = parseToolResult(await fixture.callTool({
    name: "register_stock_purchase_wallet_hash", arguments: { planId: walletConfirmation.plan.planId, txHash: walletBroadcast.walletHash }
  }));
  assert.equal(hashRegistration.status, "wallet_transaction_observed");
  assert.equal(hashRegistration.noAdditionalBroadcast, true);
  const substitutedWalletHash = parseToolResult(await fixture.callTool({
    name: "reconcile_stock_purchase",
    arguments: { planId: walletConfirmation.plan.planId, txHash: `0x${"ac".repeat(32)}`, maxPollAttempts: 1, pollIntervalMs: 0 }
  }));
  assert.equal(substitutedWalletHash.outcome.status, "error");
  assert.match(substitutedWalletHash.summary, /does not match the hash registered from the wallet/i);
  const walletReconciliation = parseToolResult(await fixture.callTool({
    name: "reconcile_stock_purchase", arguments: { planId: walletConfirmation.plan.planId, maxPollAttempts: 1, pollIntervalMs: 0 }
  }));
  assert.equal(walletReconciliation.reconciliation.status, "confirmed");
  assert.equal(walletReconciliation.reconciliation.success, true);
  assert.equal(walletReconciliation.reconciliation.changes.inputSpent, "1000000000000000000");
  assert.equal(walletReconciliation.reconciliation.changes.outputReceived, "995000000000000000");

  const portalPlan = await prepareExactFixturePlan(fixture, walletAddress);
  const portalSimulation = parseToolResult(await fixture.callTool({ name: "simulate_stock_action_plan", arguments: { plan: portalPlan.plan } }));
  const portalConfirmation = parseToolResult(await fixture.callTool({ name: "confirm_stock_action_plan", arguments: { plan: portalSimulation.plan } }));
  const portalReview = parseToolResult(await fixture.callTool({ name: "prepare_stock_purchase_wallet_request", arguments: { plan: portalConfirmation.plan } }));
  const portalHandoff = parseToolResult(await fixture.callTool({
    name: "create_external_stock_purchase_handoff", arguments: { planId: portalConfirmation.plan.planId }
  }));
  assert.equal(portalHandoff.outcome.status, "success");
  assert.equal(portalHandoff.status, "wallet_handoff_ready");
  const browserOpenUrl = new URL(portalHandoff.browserOpenUrl);
  const handoffId = browserOpenUrl.pathname.split("/").at(-1);
  const capability = browserOpenUrl.hash.slice(1);
  assert.ok(handoffId);
  assert.match(browserOpenUrl.pathname, /^\/open-external\/[a-f0-9]{32}$/);
  assert.match(handoffId, /^[a-f0-9]{32}$/);
  assert.match(capability, /^[A-Za-z0-9_-]{40,}$/);
  const portalPageRead = await fetch(`${relayBaseUrl}/api/handoffs/${handoffId}`, { headers: { authorization: `Bearer ${capability}` } });
  assert.equal(portalPageRead.status, 200);
  const portalAttempt = await fetch(`${relayBaseUrl}/api/handoffs/${handoffId}/attempt`, {
    method: "POST",
    headers: { origin: new URL(relayBaseUrl).origin, authorization: `Bearer ${capability}`, "content-type": "application/json" },
    body: JSON.stringify({ attemptId: "62345678-1234-4234-8234-123456789abc" })
  });
  assert.equal(portalAttempt.status, 200);
  const portalWallet = parseToolResult(await fixture.callTool({
    name: "set_test_wallet_submission",
    arguments: { transaction: portalReview.walletRequest.params[0], txHash: `0x${"12".repeat(32)}` }
  }));
  assert.equal(portalWallet.fixtureOnly, true);
  const portalSubmission = await fetch(`${relayBaseUrl}/api/handoffs/${handoffId}/submission`, {
    method: "POST",
    headers: { origin: new URL(relayBaseUrl).origin, authorization: `Bearer ${capability}`, "content-type": "application/json" },
    body: JSON.stringify({ account: walletAddress, chainId: "0x38", txHash: portalWallet.walletHash })
  });
  assert.equal(portalSubmission.status, 200);
  assert.equal((await portalSubmission.json() as Record<string, unknown>).state, "submitted");
  const portalReconciliation = parseToolResult(await fixture.callTool({
    name: "reconcile_external_stock_purchase_handoff", arguments: { handoffId }
  }));
  assert.equal(portalReconciliation.snapshot.state, "confirmed");
  assert.equal(portalReconciliation.reconciliation.status, "confirmed");
  assert.equal(portalReconciliation.reconciliation.success, true);
  assert.equal(portalReconciliation.reconciliation.changes.inputSpent, "1000000000000000000");
  assert.equal(portalReconciliation.reconciliation.changes.outputReceived, "995000000000000000");
  const portalPublicFinal = await fetch(`${relayBaseUrl}/api/handoffs/${handoffId}`, { headers: { authorization: `Bearer ${capability}` } });
  assert.equal((await portalPublicFinal.json() as Record<string, unknown>).state, "confirmed");

  const counters = parseToolResult(await fixture.callTool({ name: "get_fixture_counters", arguments: {} }));
  assert.equal(counters.externalNetworkRequests, 0);
  assert.equal(counters.mockBroadcasts, 1);
  assert.ok(counters.fixtureProviderRequests > 0);
  assert.equal(counters.nativeBalanceReads, 0, "the wallet owns the funds-and-fees decision; Ariadne never reads native balance as a gate");
  console.log(JSON.stringify({
    fixtureOnly: true,
    externalNetworkRequests: 0,
    realWalletUsed: false,
    mockBroadcasts: counters.mockBroadcasts,
    verified: [
      "the read-only BSC wallet connection tool opens the Agent panel and returns no transaction request",
      "insufficient allowance remains visible as a separate approval prerequisite without hiding the purchase plan",
      "the user-facing browser purchase tool creates a wallet-free intent while a fixture-only exact-plan tool preserves deterministic closure coverage",
      "provider-only wallet-funds simulation failure remains an explicit warning and still reaches the wallet page",
      "zero USDT and zero native balance still reach the real wallet handoff page in deterministic fixtures",
      "separate exact-amount allowance handoff",
      "approval receipt refreshes allowance and obtains a fresh quote-backed plan",
      "MCP plan simulation and modern host confirmation",
      "external test signer binds to the unchanged confirmed plan",
      "MCP broadcaster hash cannot be substituted during reconciliation",
      "receipt and before/after balances reconcile to the reviewed exact spend and minimum output",
      "MCP external-wallet adapter receives an exact EIP-1193 request only after separate plan confirmation",
      "showing the Agent-native review panel does not reserve the one wallet attempt; the user-click claim revalidates exact fields and blocks replay",
      "wallet hash registration is app-only, binds only a matching transaction, and prevents model-triggered reconciliation from poisoning an unregistered hash",
      "wallet-returned transaction hash is verified against on-chain fields before reconciliation and cannot be substituted later",
      "MCP wallet hash, receipt and second before/after balance delta reconcile without Ariadne signing or broadcasting",
      "external portal capability returns one wallet hash through the relay and the MCP verifies the same plan through finality and exact balance deltas"
    ],
    passed: true
  }, null, 2));
} finally {
  await fixture.close();
  await new Promise<void>((resolve, reject) => relayServer.server.close((error) => error ? reject(error) : resolve()));
}
