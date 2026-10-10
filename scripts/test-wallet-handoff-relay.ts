import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { WalletHandoffRelayClient, WalletHandoffStore, type ExternalWalletHandoffCreate } from "../src/services/wallet-handoff-relay.js";
import { createWalletHandoffRelayServer } from "../src/mcp/wallet-handoff-relay-server.js";

const wallet = "0x1111111111111111111111111111111111111111";
const relaySecret = "local-test-only-secret-with-more-than-32-characters";
const approvalPageSource = readFileSync(resolve(import.meta.dirname, "../src/mcp/ui/external-wallet-approval-page.ts"), "utf8");
const testInput: ExternalWalletHandoffCreate = {
  planId: "fixture-plan-1",
  account: wallet,
  chainId: "0x38",
  request: {
    from: wallet,
    to: "0x3333333333333333333333333333333333333333",
    value: "0x0",
    data: "0xa9059cbb",
    gas: "0x186a0",
    gasPrice: "0x3b9aca00"
  },
  expiresAt: Date.now() + 60_000,
  display: {
    operation: "purchase",
    issuer: "bStocks",
    ticker: "NVDA",
    underlyingName: "NVIDIA Corp",
    tokenLogoUrl: "https://onchainos.bnbstatic.com/images/web3-data/public/token/logos/nvda.png",
    issuerLogoUrl: "https://public.bnbstatic.com/images/w3w/openapi/bstocks.png",
    inputAmount: "7",
    inputSymbol: "USDT",
    inputContract: "0x55d398326f99059ff775485246999027b3197955",
    expectedOutput: "0.03",
    outputSymbol: "NVDAB",
    outputContract: "0x4444444444444444444444444444444444444444",
    minimumOutput: "0.029",
    spender: "0x5555555555555555555555555555555555555555",
    routeFeeUsd: "0.02",
    marketStatus: "unknown",
    marketCaveat: "Provider open flag does not confirm tradability",
    slippageBps: 50,
    maxGasCostBnb: "0.001",
    marketReference: { chainId: "56", platformId: "bstock", contractAddress: "0x4444444444444444444444444444444444444444" },
    marketBaseline: { tokenPrice: "237.035533", referencePrice: "237.035533", tokenPriceUpdatedAt: 1_800_000_000_000 },
    purchaseBaseline: { expectedOutput: "30000000000000000", minimumOutput: "29000000000000000", outputDecimals: 18, slippageBps: 50 },
    purchaseMaxGasCostBnb: "0.001"
  }
};

const tempRoot = mkdtempSync(join(tmpdir(), "ariadne-wallet-handoff-"));
try {
  const storeFile = join(tempRoot, "sessions.json");
  const persistedStore = new WalletHandoffStore({ portalOrigin: "https://wallet.example.test", storagePath: storeFile });
  assert.throws(() => persistedStore.create({
    ...testInput, display: { ...testInput.display, tokenLogoUrl: "https://attacker.example/fake-nvda.svg" }
  }), /approved Binance image origin/, "purchase branding cannot load an arbitrary remote image");
  const persisted = persistedStore.create(testInput);
  persistedStore.activate(persisted.id);
  const restored = new WalletHandoffStore({ portalOrigin: "https://wallet.example.test", storagePath: storeFile });
  assert.equal(restored.readInternal(persisted.id).state, "active", "active handoffs survive a relay process restart");
  assert.equal(statSync(storeFile).mode & 0o777, 0o600, "relay session state is stored with owner-only file permissions");
  const publicOpened = restored.readPublic(persisted.id, persisted.capability);
  assert.equal(publicOpened.state, "active");
  assert.equal(typeof publicOpened.pageOpenedAt, "number", "the relay records a page-open receipt only when the portal reads the handoff");
  assert.equal(restored.readInternal(persisted.id).pageOpenedAt, publicOpened.pageOpenedAt, "the internal monitor can verify the portal page-load receipt");
  const attemptId = "12345678-1234-4234-8234-123456789abc";
  const claimed = restored.claimWalletAttempt(persisted.id, persisted.capability, attemptId);
  assert.equal(typeof claimed.walletAttemptClaimedAt, "number", "the relay atomically claims the handoff before wallet access");
  assert.equal((claimed as Record<string, unknown>).walletAttemptIdHash, undefined, "the internal attempt identifier hash is never exposed");
  assert.equal(restored.claimWalletAttempt(persisted.id, persisted.capability, attemptId).walletAttemptClaimedAt, claimed.walletAttemptClaimedAt, "the same page can safely retry a pre-transaction wallet prompt");
  assert.throws(() => restored.claimWalletAttempt(persisted.id, persisted.capability, "22345678-1234-4234-8234-123456789abc"), /attempt has already started/i, "a second page cannot claim a concurrent wallet request");
  assert.throws(() => restored.portalUrlForExternalOpen(persisted.id, persisted.capability), /already been attempted/i, "the launcher cannot reopen a handoff after a wallet attempt starts");
  assert.throws(() => restored.readPublic(persisted.id, "wrong-capability"), /capability is invalid/i);
  const submitted = restored.submitFromWallet(persisted.id, persisted.capability, {
    account: wallet, chainId: "0x38", txHash: `0x${"ab".repeat(32)}`
  });
  assert.equal(submitted.state, "submitted");
  assert.throws(() => restored.submitFromWallet(persisted.id, persisted.capability, {
    account: wallet, chainId: "0x38", txHash: `0x${"cd".repeat(32)}`
  }), /already been used/i, "a portal capability cannot replace or replay its first transaction hash");
  const verified = restored.setVerification(persisted.id, {
    state: "confirmed",
    reconciliation: { status: "confirmed", success: true, changes: { inputSpent: "7", outputReceived: "0.03" } },
    resultSummary: "BSC finalized the purchase and wallet deltas matched"
  });
  assert.equal(verified.state, "confirmed");
  const reportClaim = restored.claimAgentReport(persisted.id);
  assert.equal(reportClaim.claimed, true, "one App instance can atomically claim the terminal Agent report");
  assert.equal(restored.claimAgentReport(persisted.id).status, "busy", "a concurrent App cannot send the same terminal report");
  restored.finishAgentReport(persisted.id, false);
  assert.equal(restored.claimAgentReport(persisted.id).claimed, true, "a rejected host message releases the durable claim for a later retry");
  const delivered = restored.finishAgentReport(persisted.id, true);
  assert.equal(typeof delivered.agentReportDeliveredAt, "number");
  assert.equal(restored.claimAgentReport(persisted.id).status, "delivered", "an accepted Agent report is never duplicated after reload");
  assert.throws(() => restored.setVerification(persisted.id, { state: "failed", reconciliation: {}, resultSummary: "replay" }), /Only a wallet-submitted/i);

  let now = 10_000;
  const expiringStore = new WalletHandoffStore({ portalOrigin: "http://localhost:1234", now: () => now });
  const expiring = expiringStore.create({ ...testInput, expiresAt: now + 1_000 });
  expiringStore.activate(expiring.id);
  now += 1_001;
  assert.equal(expiringStore.readPublic(expiring.id, expiring.capability).state, "expired", "an unsubmitted plan expires before a wallet transaction can be sent");
  assert.throws(() => new WalletHandoffStore({ portalOrigin: "http://wallet.example.test" }), /must use HTTPS/i);

  const launchedUrls: string[] = [];
  const app = await createWalletHandoffRelayServer({
    host: "127.0.0.1", port: 0, portalOrigin: "http://127.0.0.1:0", serviceSecret: relaySecret,
    openExternalBrowser: async (url) => { launchedUrls.push(url); },
    readMarketSnapshot: async (identity) => {
      assert.equal(identity.chainId, "56");
      assert.equal(identity.platformId, "bstock");
      assert.equal(identity.contractAddress.toLowerCase(), "0x4444444444444444444444444444444444444444");
      return { state: "available", tokenPrice: "237.5", referencePrice: "237.4", tokenPriceUpdatedAt: 1_800_000_000_500 };
    },
    readMarketCandles: async (identity, interval, limit) => {
      assert.equal(identity.chainId, "56");
      assert.equal(identity.platformId, "bstock");
      assert.equal(identity.contractAddress.toLowerCase(), "0x4444444444444444444444444444444444444444");
      assert.equal(interval, "5m");
      assert.equal(limit, 100);
      return [{ time: 1_800_000_000, open: 237.1, high: 237.8, low: 236.9, close: 237.5, volume: 12_345 }];
    }
  });
  try {
    const address = app.server.address();
    assert.ok(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const client = new WalletHandoffRelayClient({ baseUrl, secret: relaySecret });
    const created = await client.create({ ...testInput, expiresAt: Date.now() + 60_000 });
    assert.equal((await client.activate(created.id)).state, "active");
    assert.match(created.url, /^http:\/\/127\.0\.0\.1:0\/approve#/);
    const directPortalUrl = new URL(created.url);
    assert.match(directPortalUrl.hash, /^#[a-f0-9]{32}\.[A-Za-z0-9_-]{40,}$/, "the direct page URL must retain both one-time values in its fragment");
    assert.equal((await client.read(created.id)).pageOpenedAt, undefined, "creating and activating a handoff alone is not evidence the page loaded");

    const browserOpenUrl = client.browserOpenUrl(created.id, created.capability, created.url);
    const launcherUrl = new URL(browserOpenUrl);
    assert.equal(launcherUrl.pathname, `/open-external/${created.id}`);
    assert.equal(launcherUrl.hash, `#${created.capability}`);
    const launcherResponse = await fetch(`${baseUrl}${launcherUrl.pathname}`);
    assert.equal(launcherResponse.status, 200);
    const launcherHtml = await launcherResponse.text();
    assert.match(launcherHtml, /fetch\("\/api\/open-external"/);
    assert.doesNotMatch(launcherHtml, new RegExp(created.capability), "the launcher keeps the bearer capability in the fragment instead of embedding it into the page body");
    assert.equal(launchedUrls.length, 0, "opening or previewing the launcher HTML alone does not start the system browser");
    const openResponse = await fetch(`${baseUrl}/api/open-external`, {
      method: "POST",
      headers: { origin: baseUrl, "content-type": "application/json" },
      body: JSON.stringify({ handoffId: created.id, capability: created.capability })
    });
    assert.equal(openResponse.status, 200);
    assert.deepEqual(launchedUrls, [created.url], "the local launcher opens only the validated exact one-time approval page");
    assert.equal((await client.read(created.id)).pageOpenedAt, undefined, "launching the external browser is not misreported as the approval page loading");
    const invalidOpen = await fetch(`${baseUrl}/api/open-external`, {
      method: "POST",
      headers: { origin: baseUrl, "content-type": "application/json" },
      body: JSON.stringify({ handoffId: created.id, capability: "invalid-capability" })
    });
    assert.notEqual(invalidOpen.status, 200, "an invalid one-time capability cannot open a wallet page");
    assert.equal(launchedUrls.length, 1);

    const wrongPortOpen = await fetch(`${baseUrl}/api/open-external`, {
      method: "POST",
      headers: { origin: "http://127.0.0.1:1", "content-type": "application/json" },
      body: JSON.stringify({ handoffId: created.id, capability: created.capability })
    });
    assert.equal(wrongPortOpen.status, 403, "a loopback origin on another port cannot use this relay launcher");

    const page = await fetch(`${baseUrl}/approve`);
    assert.equal(page.status, 200);
    const pageHtml = await page.text();
    assert.match(pageHtml, /Ariadne/);
    assert.match(pageHtml, /<main id="app"/, "the approval page includes the mount point required by its browser bundle");
    assert.match(pageHtml, /connect_execute_started/);
    assert.match(pageHtml, /eth_sendTransaction/);
    assert.match(pageHtml, /id="badge-canvas"/, "the first act contains the WebGL Ariadne badge canvas");
    assert.doesNotMatch(pageHtml, /class="data-horizon"|@keyframes horizon-|class="orbit"|class="intro-grid"|@keyframes orbit/, "the cinematic intro is pure black behind the 3D mark, without background geometry");
    assert.match(pageHtml, /class="dashboard"/, "the second act contains the trading review dashboard");
    assert.match(pageHtml, /原计划 → 最新执行条件/);
    assert.match(pageHtml, /data:image\/webp;base64,/);
    assert.match(pageHtml, /prefers-reduced-motion/);
    assert.match(pageHtml, /计划确认时/);
    assert.match(pageHtml, /<span>当前<\/span>/);
    assert.match(pageHtml, /id="plan-output"/);
    assert.match(pageHtml, /ARIADNE EXECUTION CONSOLE/);
    assert.match(pageHtml, /id="flow-allowance"/);
    assert.match(pageHtml, /id="execution-events"/);
    assert.match(pageHtml, /Binance Web3 返回的 BSC 代币 OHLC K 线/);
    assert.match(pageHtml, /data-chart-interval="5m"/);
    assert.doesNotMatch(pageHtml, /market-chart-frame|tradingview\.com\/widgetembed/, "the chart does not substitute an unrelated hosted market symbol");
    assert.equal(page.headers.get("cache-control"), "no-store, max-age=0");
    assert.match(page.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
    assert.match(page.headers.get("content-security-policy") ?? "", /https:\/\/onchainos\.bnbstatic\.com/);
    assert.match(page.headers.get("content-security-policy") ?? "", /https:\/\/public\.bnbstatic\.com/);

    const allowanceInput: ExternalWalletHandoffCreate = {
      ...testInput,
      planId: "fixture-allowance-plan",
      display: {
        ...testInput.display, operation: "allowance_approval", expectedOutput: "No stock purchased in this step", minimumOutput: "Not applicable"
      }
    };
    const allowanceCreated = await client.create(allowanceInput);
    await client.activate(allowanceCreated.id);
    const allowanceSnapshot = await client.read(allowanceCreated.id);
    assert.equal(allowanceSnapshot.display.operation, "allowance_approval");
    assert.equal(allowanceSnapshot.display.expectedOutput, "No stock purchased in this step");
    const allowanceHtml = await fetch(`${baseUrl}/approve`).then((response) => response.text());
    assert.match(allowanceHtml, /data-view="intro"/, "the page starts in the cinematic intro before handoff details load");
    assert.match(allowanceHtml, /<dl id="plan" class="plan" aria-label="完整购买计划与交易参数"><\/dl>/, "the browser populates exact confirmed-plan details from the one-time handoff");
    assert.match(approvalPageSource, /钱包链接缺少一次性识别码/, "a missing fragment must be identified directly so the user knows to open the full conversation link");

    const marketSnapshot = await client.readMarket(allowanceCreated.id, allowanceCreated.capability);
    assert.equal(marketSnapshot.state, "available");
    assert.equal(marketSnapshot.source, "Binance Web3");
    assert.equal(marketSnapshot.tokenPrice, "237.5");
    assert.equal(marketSnapshot.tokenPriceUpdatedAt, 1_800_000_000_500);
    const candles = await client.readCandles(allowanceCreated.id, allowanceCreated.capability, "5m", 100);
    assert.equal(candles.state, "available");
    assert.equal(candles.source, "Binance Web3");
    assert.equal(candles.interval, "5m");
    assert.deepEqual(candles.candles, [{ time: 1_800_000_000, open: 237.1, high: 237.8, low: 236.9, close: 237.5, volume: 12_345 }]);
    const unauthorizedMarket = await fetch(`${baseUrl}/api/handoffs/${allowanceCreated.id}/market`);
    assert.equal(unauthorizedMarket.status, 401, "live market snapshots require the handoff bearer capability");
    const unauthorizedCandles = await fetch(`${baseUrl}/api/handoffs/${allowanceCreated.id}/candles?interval=5m&limit=100`);
    assert.equal(unauthorizedCandles.status, 401, "token candles require the handoff bearer capability");
    const invalidCandleInterval = await fetch(`${baseUrl}/api/handoffs/${allowanceCreated.id}/candles?interval=2s&limit=100`, {
      headers: { authorization: `Bearer ${allowanceCreated.capability}` }
    });
    assert.equal(invalidCandleInterval.status, 400, "unsupported chart intervals fail closed");

    const allowancePageLoad = await fetch(`${baseUrl}/api/handoffs/${allowanceCreated.id}`, { headers: { authorization: `Bearer ${allowanceCreated.capability}` } });
    assert.equal(allowancePageLoad.status, 200);
    const clientStage = await fetch(`${baseUrl}/api/handoffs/${allowanceCreated.id}/client-stage`, {
      method: "POST", headers: { origin: baseUrl, authorization: `Bearer ${allowanceCreated.capability}`, "content-type": "application/json" },
      body: JSON.stringify({ stage: "provider_selected", detail: "io.metamask" })
    });
    assert.equal(clientStage.status, 200, "the page can persist its last completed wallet stage");
    const staged = await client.read(allowanceCreated.id);
    assert.equal(staged.clientStage, "provider_selected");
    assert.equal(staged.clientStageDetail, "io.metamask");
    assert.equal(typeof staged.clientStageAt, "number");
    const connectExecuteStage = await fetch(`${baseUrl}/api/handoffs/${allowanceCreated.id}/client-stage`, {
      method: "POST", headers: { origin: baseUrl, authorization: `Bearer ${allowanceCreated.capability}`, "content-type": "application/json" },
      body: JSON.stringify({ stage: "connect_execute_started", detail: "reviewed account · BSC" })
    });
    assert.equal(connectExecuteStage.status, 200, "the page can persist the combined MetaMask connection-and-execution stage");
    const connectExecuteStaged = await client.read(allowanceCreated.id);
    assert.equal(connectExecuteStaged.clientStage, "connect_execute_started");
    assert.equal(connectExecuteStaged.clientStageDetail, "reviewed account · BSC");
    const invalidStage = await fetch(`${baseUrl}/api/handoffs/${allowanceCreated.id}/client-stage`, {
      method: "POST", headers: { origin: baseUrl, authorization: `Bearer ${allowanceCreated.capability}`, "content-type": "application/json" },
      body: JSON.stringify({ stage: "pretend_success" })
    });
    assert.notEqual(invalidStage.status, 200, "unknown wallet stages are rejected");
    const unauthorizedStage = await fetch(`${baseUrl}/api/handoffs/${allowanceCreated.id}/client-stage`, {
      method: "POST", headers: { origin: baseUrl, "content-type": "application/json" }, body: JSON.stringify({ stage: "page_loaded" })
    });
    assert.equal(unauthorizedStage.status, 401, "wallet-stage reports require the one-time capability");
    const failureInput = { ...testInput, planId: "fixture-pre-wallet-failure", expiresAt: Date.now() + 60_000 };
    const failureCreated = await client.create(failureInput);
    await client.activate(failureCreated.id);
    await fetch(`${baseUrl}/api/handoffs/${failureCreated.id}`, { headers: { authorization: `Bearer ${failureCreated.capability}` } });
    const clientFailure = await fetch(`${baseUrl}/api/handoffs/${failureCreated.id}/client-failure`, {
      method: "POST", headers: { origin: baseUrl, authorization: `Bearer ${failureCreated.capability}`, "content-type": "application/json" },
      body: JSON.stringify({ stage: "wallet_discovery", reason: "MetaMask provider was not found" })
    });
    assert.equal(clientFailure.status, 200, "a page can persist a terminal pre-wallet failure");
    const failedBeforeWallet = await client.read(failureCreated.id);
    assert.equal(failedBeforeWallet.state, "failed");
    assert.equal(failedBeforeWallet.txHash, undefined);
    assert.equal(failedBeforeWallet.reconciliation?.fundsChanged, false);
    assert.equal(failedBeforeWallet.reconciliation?.stage, "wallet_discovery");
    assert.equal((await client.claimAgentReport(failureCreated.id)).claimed, true, "pre-wallet failure is proactively reportable with durable deduplication");
    await client.finishAgentReport(failureCreated.id, true);
    assert.equal((await client.claimAgentReport(failureCreated.id)).status, "delivered");
    const duplicateFailure = await fetch(`${baseUrl}/api/handoffs/${failureCreated.id}/client-failure`, {
      method: "POST", headers: { origin: baseUrl, authorization: `Bearer ${failureCreated.capability}`, "content-type": "application/json" },
      body: JSON.stringify({ stage: "wallet_preflight", reason: "duplicate" })
    });
    assert.notEqual(duplicateFailure.status, 200, "a terminal failure cannot be rewritten by the page");
    const allowanceAttemptId = "52345678-1234-4234-8234-123456789abc";
    app.store.claimWalletAttempt(allowanceCreated.id, allowanceCreated.capability, allowanceAttemptId);
    app.store.submitFromWallet(allowanceCreated.id, allowanceCreated.capability, { account: wallet, chainId: "0x38", txHash: `0x${"cd".repeat(32)}` });
    app.store.setVerification(allowanceCreated.id, {
      state: "confirmed", reconciliation: { purchaseFollowUpStatus: "preparing" }, resultSummary: "Allowance finalized; preparing same-plan continuation."
    });
    const child = await client.createFollowUp(allowanceCreated.id, allowanceCreated.capability, {
      ...testInput, planId: "fixture-follow-up-plan"
    });
    await client.activate(child.id);
    await client.setContinuationStatus(allowanceCreated.id, { status: "ready", followUpHandoffId: child.id });
    const childPageLoad = await fetch(`${baseUrl}/api/handoffs/${child.id}`, { headers: { authorization: `Bearer ${child.capability}` } });
    assert.equal(childPageLoad.status, 200);
    const followUpFromBrowser = await client.readFollowUp(allowanceCreated.id, allowanceCreated.capability);
    assert.deepEqual(followUpFromBrowser, { id: child.id, capability: child.capability }, "the original page can securely discover its one-time purchase follow-up");
    assert.equal(app.store.readInternal(allowanceCreated.id).followUpHandoffId, child.id);
    assert.equal(app.store.readPublic(allowanceCreated.id, allowanceCreated.capability).reconciliation?.purchaseFollowUpStatus, "ready");
    await assert.rejects(() => client.readFollowUp(allowanceCreated.id, "wrong-capability-that-is-long-enough-to-test"), /invalid/i);
    assert.equal((await app.store.readInternal(child.id)).display.operation, "purchase");

    const publicRead = await fetch(`${baseUrl}/api/handoffs/${created.id}`, { headers: { authorization: `Bearer ${created.capability}` } });
    assert.equal(publicRead.status, 200);
    const view = await publicRead.json() as Record<string, unknown>;
    assert.equal(view.state, "active");
    assert.equal(view.capabilityHash, undefined, "the portal never receives the stored capability hash");
    assert.equal((view.display as Record<string, unknown>).inputContract, testInput.display.inputContract);

    const openedForWallet = await fetch(`${baseUrl}/api/handoffs/${created.id}`, { headers: { authorization: `Bearer ${created.capability}` } });
    assert.equal(openedForWallet.status, 200);
    const pageAttempt = "32345678-1234-4234-8234-123456789abc";
    const claimResponse = await fetch(`${baseUrl}/api/handoffs/${created.id}/attempt`, {
      method: "POST", headers: { origin: baseUrl, authorization: `Bearer ${created.capability}`, "content-type": "application/json" },
      body: JSON.stringify({ attemptId: pageAttempt })
    });
    assert.equal(claimResponse.status, 200, "the real portal origin can claim its one wallet request");
    const duplicatePageAttempt = await fetch(`${baseUrl}/api/handoffs/${created.id}/attempt`, {
      method: "POST", headers: { origin: baseUrl, authorization: `Bearer ${created.capability}`, "content-type": "application/json" },
      body: JSON.stringify({ attemptId: "42345678-1234-4234-8234-123456789abc" })
    });
    assert.equal(duplicatePageAttempt.status, 409, "a second approval page cannot claim the same handoff");

    const blockedOrigin = await fetch(`${baseUrl}/api/handoffs/${created.id}/submission`, {
      method: "POST", headers: { origin: "https://attacker.example", authorization: `Bearer ${created.capability}`, "content-type": "application/json" },
      body: JSON.stringify({ account: wallet, chainId: "0x38", txHash: `0x${"ef".repeat(32)}` })
    });
    assert.equal(blockedOrigin.status, 403, "cross-origin result injection is rejected");

    const walletResult = await fetch(`${baseUrl}/api/handoffs/${created.id}/submission`, {
      method: "POST", headers: { origin: baseUrl, authorization: `Bearer ${created.capability}`, "content-type": "application/json" },
      body: JSON.stringify({ account: wallet, chainId: "0x38", txHash: `0x${"ef".repeat(32)}` })
    });
    assert.equal(walletResult.status, 200);
    assert.equal((await walletResult.json() as Record<string, unknown>).state, "submitted");
    assert.equal((await client.read(created.id)).txHash, `0x${"ef".repeat(32)}`);

    const wrongSecret = await fetch(`${baseUrl}/api/internal/handoffs/${created.id}`, { headers: { authorization: "Bearer wrong" } });
    assert.equal(wrongSecret.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => app.server.close((error) => error ? reject(error) : resolve()));
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Wallet handoff relay passed: one-time capability, system-browser launcher, restart persistence, HTTPS and loopback boundaries, wallet-stage telemetry, cinematic portal contract, CSP, same-origin result binding, and no replay.");
