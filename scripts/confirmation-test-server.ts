import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { confirmPlan } from "../src/domain/action-plan.js";
import { createSyntheticConfirmationPlan } from "./fixtures/synthetic-confirmation-plan.js";
import { PlanRegistry } from "../src/mcp/plan-registry.js";
import { clientCapabilitiesForRequest, registerActionPlanConfirmationTool, supportsFormElicitation } from "../src/mcp/user-confirmation.js";
import { textResult } from "../src/mcp/response.js";

function createSyntheticServer() {
const registry = new PlanRegistry();
let fixture = createSyntheticConfirmationPlan(undefined, registry);
const server = new McpServer({ name: "ariadne-confirmation-form-test", version: "0.1.0" });

function currentFixture() {
  try {
    registry.requireExact(fixture.plan, "simulated");
  } catch {
    fixture = createSyntheticConfirmationPlan(undefined, registry);
  }
  return fixture;
}

server.registerTool("get_synthetic_confirmation_plan", {
  description: "Return a clearly synthetic, process-local test plan. It makes no network or wallet calls.",
  inputSchema: {},
}, async () => {
  const { plan } = currentFixture();
  return textResult({
    mode: "isolated synthetic confirmation test",
    syntheticOnly: true,
    networkRequests: 0,
    realWalletUsed: false,
    signingAvailable: false,
    broadcastAvailable: false,
    plan,
  }, { structuredContent: true });
});

registerActionPlanConfirmationTool(server, registry);

server.registerTool("get_synthetic_confirmation_status", {
  description: "Read the in-memory status of the synthetic test plan; this server has no signing or broadcast tools.",
  inputSchema: {},
}, async (_args, ctx) => {
  let planStatus: string = "not_found_or_expired";
  try {
    planStatus = registry.requireExact(fixture.plan, "simulated").status;
  } catch {
    try {
      planStatus = registry.requireExact(confirmPlan(fixture.plan), "confirmed").status;
    } catch {
      // The fixture is process-local and expires; its status is never inferred.
    }
  }
  return textResult({
    mode: "isolated synthetic confirmation test",
    syntheticOnly: true,
    planStatus,
    connectedHostFormElicitationAdvertised: supportsFormElicitation(clientCapabilitiesForRequest(ctx, server)),
    signingAvailable: false,
    broadcastAvailable: false,
  }, { structuredContent: true });
});

return server;
}

serveStdio(() => createSyntheticServer(), {
  onerror: (error) => console.error(`Synthetic confirmation test transport error: ${error.name}: ${error.message}`)
});
