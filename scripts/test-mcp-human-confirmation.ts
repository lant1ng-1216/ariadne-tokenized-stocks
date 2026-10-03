import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { CLIENT_CAPABILITIES_META_KEY, type McpServer, type ServerContext } from "@modelcontextprotocol/server";
import type { ActionPlan } from "../src/domain/types.js";
import { PlanRegistry } from "../src/mcp/plan-registry.js";
import { registerActionPlanConfirmationTool } from "../src/mcp/user-confirmation.js";
import { createSyntheticConfirmationPlan } from "./fixtures/synthetic-confirmation-plan.js";

const sdkUsage = await readFile("docs/SDK_USAGE.md", "utf8");
assert.match(sdkUsage, /collect explicit user approval before calling `confirm\(plan\)`/);
assert.match(sdkUsage, /SDK cannot independently prove that a person approved/);
assert.doesNotMatch(sdkUsage, /confirmation token is an operation identifier/i);

async function exerciseModernConfirmation(
  label: string,
  answer: "approve" | "decline" | "cancel",
  expectedStatus: "approved" | "declined" | "cancelled",
) {
  const client = new Client(
    { name: `ariadne-confirmation-modern-${label}`, version: "0.1.0" },
    {
      capabilities: { elicitation: { form: {} } },
      versionNegotiation: { mode: { pin: "2026-07-28" } },
    },
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "scripts/confirmation-test-server.ts"],
    cwd: process.cwd(),
    stderr: "inherit",
  });
  let capturedMessage = "";
  let capturedSchema: Record<string, unknown> | undefined;
  client.setRequestHandler("elicitation/create", async (request) => {
    capturedMessage = request.params.message;
    if (request.params.mode !== "form") throw new Error("The confirmation must use a form elicitation.");
    capturedSchema = request.params.requestedSchema as Record<string, unknown>;
    if (answer === "cancel") return { action: "cancel" };
    if (answer === "decline") return { action: "decline" };
    return { action: "accept", content: { decision: "approve" } };
  });

  try {
    await client.connect(transport);
    assert.equal(client.getProtocolEra(), "modern", "the test must exercise the 2026 multi-round-trip protocol");
    const listed = await client.listTools();
    const names = listed.tools.map(({ name }) => name).sort();
    assert.deepEqual(names, [
      "confirm_stock_action_plan",
      "get_synthetic_confirmation_plan",
      "get_synthetic_confirmation_status",
    ]);
    assert.doesNotMatch(names.join(" "), /broadcast|sign|simulate|create_stock_action_plan/i);

    const fixtureResult = await client.callTool({ name: "get_synthetic_confirmation_plan", arguments: {} });
    const fixture = fixtureResult.structuredContent as {
      syntheticOnly?: boolean;
      networkRequests?: number;
      realWalletUsed?: boolean;
      signingAvailable?: boolean;
      broadcastAvailable?: boolean;
      plan?: { planId?: string; status?: string; expiresAt?: number; intent?: { toAsset?: { tokenSymbol?: string } } };
    };
    assert.equal(fixture.syntheticOnly, true);
    assert.equal(fixture.networkRequests, 0);
    assert.equal(fixture.realWalletUsed, false);
    assert.equal(fixture.signingAvailable, false);
    assert.equal(fixture.broadcastAvailable, false);
    assert.equal(fixture.plan?.status, "simulated");
    assert.equal(fixture.plan?.intent?.toAsset?.tokenSymbol, "TESTB");
    assert.match(fixture.plan?.planId ?? "", /^synthetic_confirmation_host_fixture_[0-9a-f-]{36}$/i);
    assert.ok((fixture.plan?.expiresAt ?? 0) > Date.now(), "the isolated server must provide a fresh, unexpired synthetic plan");
    assert.ok(fixture.plan);
    const hostStatus = await client.callTool({ name: "get_synthetic_confirmation_status", arguments: {} });
    assert.equal(
      (hostStatus.structuredContent as Record<string, unknown> | undefined)?.connectedHostFormElicitationAdvertised,
      true,
      JSON.stringify(hostStatus.structuredContent),
    );

    const confirmation = await client.callTool({
      name: "confirm_stock_action_plan",
      arguments: { plan: fixture.plan },
    });
    const response = JSON.parse(
      (confirmation.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}",
    ) as { confirmationStatus?: string; plan?: { status?: string }; outcome?: { sideEffects?: string } };
    for (const requiredDetail of [
      "Ariadne requests an explicit user decision for this exact simulated action plan.",
      "Operation: buy",
      "Input amount: 1.25 (decimals: 6)",
      "Input token contract: 0x2222222222222222222222222222222222222222",
      "Wallet: 0x1111111111111111111111111111111111111111",
      "Underlying asset: Synthetic TEST asset — not a real security (TEST)",
      "Representation: TESTB; issuer/platform: synthetic-test-only",
      "Asset chain / contract: 56 / 0x4444444444444444444444444444444444444444",
      "Planned action / chain: evm_transaction / 56",
      "Transaction target: 0x3333333333333333333333333333333333333333",
      "Native transaction value (wei): 0",
      "Provider-reported expected output (raw token units): 1250000",
      "Maximum gas budget (BNB): 0.0002",
      `Plan expiry (UTC): ${new Date(fixture.plan!.expiresAt!).toISOString()}`,
    ]) {
      assert.equal(capturedMessage.includes(requiredDetail), true, `confirmation must show exact plan detail: ${requiredDetail}`);
    }
    assert.match(capturedMessage, /does not sign, submit, or broadcast/i);
    assert.deepEqual((capturedSchema?.properties as Record<string, unknown>)?.decision, {
      type: "string",
      title: "Review this simulated transaction plan",
      description: "Choose approve only if the exact plan details below are expected.",
      enum: ["approve", "decline"],
      enumNames: ["Approve plan", "Decline"],
    });
    assert.equal(response.confirmationStatus, expectedStatus);
    assert.equal(response.plan?.status, expectedStatus === "approved" ? "confirmed" : "simulated");
    assert.equal(response.outcome?.sideEffects, expectedStatus === "approved" ? "external_signature_required" : "none");

    const status = await client.callTool({ name: "get_synthetic_confirmation_status", arguments: {} });
    const statusContent = status.structuredContent as Record<string, unknown> | undefined;
    assert.equal(statusContent?.planStatus, expectedStatus === "approved" ? "confirmed" : "simulated");
    assert.equal(statusContent?.signingAvailable, false);
    assert.equal(statusContent?.broadcastAvailable, false);
  } finally {
    await client.close();
  }
}

async function exerciseUnsupportedHostFailsClosed() {
  const client = new Client(
    { name: "ariadne-confirmation-modern-no-form", version: "0.1.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "scripts/confirmation-test-server.ts"],
    cwd: process.cwd(),
    stderr: "inherit",
  });

  try {
    await client.connect(transport);
    assert.equal(client.getProtocolEra(), "modern");
    const fixtureResult = await client.callTool({ name: "get_synthetic_confirmation_plan", arguments: {} });
    const fixture = fixtureResult.structuredContent as { plan?: { planId?: string; status?: string; expiresAt?: number } };
    assert.ok(fixture.plan);
    assert.equal(fixture.plan.status, "simulated");
    assert.ok((fixture.plan.expiresAt ?? 0) > Date.now());

    const confirmation = await client.callTool({
      name: "confirm_stock_action_plan",
      arguments: { plan: fixture.plan },
    });
    const result = JSON.parse(
      (confirmation.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}",
    ) as { confirmationStatus?: string; plan?: { status?: string }; outcome?: { sideEffects?: string } };
    assert.equal(result.confirmationStatus, "unavailable");
    assert.equal(result.plan?.status, "simulated");
    assert.equal(result.outcome?.sideEffects, "none");

    const status = await client.callTool({ name: "get_synthetic_confirmation_status", arguments: {} });
    const statusContent = status.structuredContent as Record<string, unknown> | undefined;
    assert.equal(statusContent?.connectedHostFormElicitationAdvertised, false);
    assert.equal(statusContent?.planStatus, "simulated");
    assert.equal(statusContent?.signingAvailable, false);
    assert.equal(statusContent?.broadcastAvailable, false);
  } finally {
    await client.close();
  }
}

async function exerciseContinuationIntegrity() {
  type ConfirmationHandler = (args: { plan: ActionPlan }, ctx: ServerContext) => Promise<unknown>;
  const createHarness = () => {
    const registry = new PlanRegistry();
    const fixture = createSyntheticConfirmationPlan(undefined, registry);
    const handlers = new Map<string, ConfirmationHandler>();
    const server = {
      server: { getClientCapabilities: () => undefined },
      registerTool: (name: string, _config: unknown, callback: ConfirmationHandler) => handlers.set(name, callback),
    } as unknown as McpServer;
    registerActionPlanConfirmationTool(server, registry);
    const handler = handlers.get("confirm_stock_action_plan");
    assert.ok(handler);
    const context = (state?: string, inputResponses?: Record<string, unknown>) => ({
      mcpReq: {
        requestState: () => state,
        inputResponses,
        envelope: { [CLIENT_CAPABILITIES_META_KEY]: { elicitation: { form: {} } } },
      },
    } as unknown as ServerContext);
    return { registry, plan: fixture.plan, handler, context };
  };
  const payload = (result: unknown) => {
    const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
    return JSON.parse(content.find((item) => item.type === "text")?.text ?? "{}") as {
      confirmationStatus?: string;
      plan?: ActionPlan;
      summary?: string;
      outcome?: { status?: string; sideEffects?: string; error?: { code?: string } };
    };
  };
  const begin = async (harness: ReturnType<typeof createHarness>) => {
    const result = await harness.handler({ plan: harness.plan }, harness.context());
    const state = (result as { requestState?: string }).requestState;
    assert.equal((result as { resultType?: string }).resultType, "input_required");
    assert.ok(state);
    return state;
  };
  const approval = { confirmation: { action: "accept", content: { decision: "approve" } } };

  const malformed = createHarness();
  const malformedState = await begin(malformed);
  const malformedResult = payload(await malformed.handler(
    { plan: malformed.plan }, malformed.context(malformedState, { confirmation: { action: "accept", content: { decision: "execute" } } }),
  ));
  assert.equal(malformedResult.confirmationStatus, "invalid_response");
  assert.equal(malformed.registry.requireExact(malformed.plan, "simulated").status, "simulated");

  const tampered = createHarness();
  const validState = await begin(tampered);
  const tamperedResult = payload(await tampered.handler({ plan: tampered.plan }, tampered.context(`${validState}x`, approval)));
  assert.equal(tamperedResult.confirmationStatus, "invalid_response");
  assert.equal(tampered.registry.requireExact(tampered.plan, "simulated").status, "simulated");
  const recoveredResult = payload(await tampered.handler({ plan: tampered.plan }, tampered.context(validState, approval)));
  assert.equal(recoveredResult.confirmationStatus, "approved", "a rejected forged state must not consume the valid continuation");

  const changed = createHarness();
  const changedState = await begin(changed);
  const changedPlan = { ...changed.plan, expectedOutput: "forged-output" } as ActionPlan;
  const changedResult = payload(await changed.handler({ plan: changedPlan }, changed.context(changedState, approval)));
  assert.equal(changedResult.summary, "Plan was changed or is not at the required stage; prepare a new plan");
  assert.equal(changedResult.outcome?.status, "error");
  assert.equal(changedResult.outcome?.sideEffects, "none");
  assert.equal(changedResult.outcome?.error?.code, "confirmation_rejected");
  assert.equal(changed.registry.requireExact(changed.plan, "simulated").status, "simulated");

  const approved = createHarness();
  const approvedState = await begin(approved);
  const approvedResult = payload(await approved.handler({ plan: approved.plan }, approved.context(approvedState, approval)));
  assert.equal(approvedResult.confirmationStatus, "approved");
  assert.ok(approvedResult.plan);
  assert.equal(approvedResult.plan.planId, approved.plan.planId);
  assert.equal(approvedResult.plan.expectedOutput, approved.plan.expectedOutput);
  assert.deepEqual(approvedResult.plan.intent, approved.plan.intent);
  assert.equal(approved.registry.requireExact(approvedResult.plan, "confirmed").status, "confirmed");
  const repeatedApproval = payload(await approved.handler({ plan: approvedResult.plan }, approved.context(approvedState, approval)));
  assert.notEqual(repeatedApproval.confirmationStatus, "approved");
  assert.equal(approved.registry.requireExact(approvedResult.plan, "confirmed").status, "confirmed");

  const replayed = createHarness();
  const replayState = await begin(replayed);
  const firstReply = payload(await replayed.handler({ plan: replayed.plan }, replayed.context(replayState, {
    confirmation: { action: "decline" },
  })));
  const replayReply = payload(await replayed.handler({ plan: replayed.plan }, replayed.context(replayState, approval)));
  assert.equal(firstReply.confirmationStatus, "declined");
  assert.equal(replayReply.confirmationStatus, "invalid_response");
  assert.equal(replayed.registry.requireExact(replayed.plan, "simulated").status, "simulated");

  const expired = createHarness();
  const originalNow = Date.now;
  const startedAt = originalNow();
  let expiredState = "";
  let expiredResult: ReturnType<typeof payload> | undefined;
  try {
    Date.now = () => startedAt;
    expiredState = await begin(expired);
    Date.now = () => startedAt + 5 * 60_000 + 1;
    expiredResult = payload(await expired.handler({ plan: expired.plan }, expired.context(expiredState, approval)));
  } finally {
    Date.now = originalNow;
  }
  assert.equal(expiredResult?.confirmationStatus, "invalid_response");
  assert.equal(expired.registry.requireExact(expired.plan, "simulated").status, "simulated");

  return {
    malformedChoiceRejected: true,
    tamperedStateRejectedWithoutConsumingValidContinuation: true,
    changedPlanHasSpecificErrorAndRemainsSimulated: true,
    exactApprovalAdvancesOnceAndReplayCannotAdvanceAgain: true,
    replayRejected: true,
    expiredContinuationRejected: true,
  };
}

await exerciseModernConfirmation("approve", "approve", "approved");
await exerciseModernConfirmation("decline", "decline", "declined");
await exerciseModernConfirmation("cancel", "cancel", "cancelled");
await exerciseUnsupportedHostFailsClosed();
const continuationIntegrity = await exerciseContinuationIntegrity();

console.log(JSON.stringify({
  modernProtocolNegotiated: true,
  embeddedHostFormWasHandled: true,
  explicitApprovalAdvancesSyntheticPlanOnce: true,
  declineAndCancelLeaveSyntheticPlanSimulated: true,
  unsupportedHostFailsClosed: true,
  syntheticFixtureStartsFreshAndUnexpired: true,
  continuationIntegrity,
  formShowsExactPlanAndNoExecutionClaim: true,
  realWalletUsed: false,
  networkRequests: 0,
  signingTools: 0,
  broadcastTools: 0,
  passed: true,
}, null, 2));
