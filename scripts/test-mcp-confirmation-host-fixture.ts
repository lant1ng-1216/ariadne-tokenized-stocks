import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ElicitRequestSchema, type ElicitRequestFormParams } from "@modelcontextprotocol/sdk/types.js";

const client = new Client(
  { name: "ariadne-confirmation-fixture-regression", version: "0.1.0" },
  { capabilities: { elicitation: { form: {} } } },
);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", "scripts/confirmation-test-server.ts"],
  cwd: process.cwd(),
  stderr: "inherit",
});
let capturedForm: ElicitRequestFormParams | undefined;
client.setRequestHandler(ElicitRequestSchema, async (request) => {
  capturedForm = request.params as ElicitRequestFormParams;
  return { action: "decline" };
});

try {
  await client.connect(transport);
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
    plan?: { status?: string; intent?: { toAsset?: { tokenSymbol?: string } } };
  };
  assert.equal(fixture.syntheticOnly, true);
  assert.equal(fixture.networkRequests, 0);
  assert.equal(fixture.realWalletUsed, false);
  assert.equal(fixture.signingAvailable, false);
  assert.equal(fixture.broadcastAvailable, false);
  assert.equal(fixture.plan?.status, "simulated");
  assert.equal(fixture.plan?.intent?.toAsset?.tokenSymbol, "TESTB");
  assert.ok(fixture.plan);

  const confirmation = await client.callTool({
    name: "confirm_stock_action_plan",
    arguments: { plan: fixture.plan },
  });
  const response = JSON.parse(
    (confirmation.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}",
  ) as { confirmationStatus?: string; plan?: { status?: string }; outcome?: { sideEffects?: string } };
  assert.equal(capturedForm?.mode, "form");
  assert.match(capturedForm?.message ?? "", /TESTB/);
  assert.match(capturedForm?.message ?? "", /does not sign, submit, or broadcast/i);
  assert.equal(response.confirmationStatus, "not_confirmed");
  assert.equal(response.plan?.status, "simulated");
  assert.equal(response.outcome?.sideEffects, "none");

  const status = await client.callTool({ name: "get_synthetic_confirmation_status", arguments: {} });
  const statusContent = status.structuredContent as Record<string, unknown> | undefined;
  assert.equal(statusContent?.planStatus, "simulated");
  assert.equal(statusContent?.connectedHostFormElicitationAdvertised, true);
  assert.equal(statusContent?.signingAvailable, false);
  assert.equal(statusContent?.broadcastAvailable, false);

  console.log(JSON.stringify({
    isolatedStdioServerStarted: true,
    onlySyntheticAndConfirmationToolsExposed: true,
    formElicitationRequestReceived: true,
    connectedHostFormCapabilityObserved: true,
    decliningLeavesSyntheticPlanSimulated: true,
    realWalletUsed: false,
    networkRequests: 0,
    signingTools: 0,
    broadcastTools: 0,
    passed: true,
  }, null, 2));
} finally {
  await client.close();
}
