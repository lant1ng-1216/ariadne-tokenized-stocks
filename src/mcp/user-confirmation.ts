import { randomUUID } from "node:crypto";
import { CLIENT_CAPABILITIES_META_KEY, inputRequired, inputResponse, McpServer, type ClientCapabilities, type ServerContext } from "@modelcontextprotocol/server";
import { confirmPlan } from "../domain/action-plan.js";
import type { ActionPlan } from "../domain/types.js";
import { PlanRegistry } from "./plan-registry.js";
import { errorOutcome, outcome, textResult } from "./response.js";
import { z } from "zod";

type ConfirmationStatus = "approved" | "declined" | "cancelled" | "unavailable" | "invalid_response";

/**
 * Register an explicit, host-rendered confirmation step for one exact
 * simulated plan. MCP 2026 clients render the embedded form and retry the
 * original call; the v2 SDK supplies a compatibility shim for capable 2025
 * clients. No client-supplied plan ID is treated as approval.
 */
export function registerActionPlanConfirmationTool(
  server: McpServer,
  plans: PlanRegistry,
  validate?: (plan: ActionPlan) => void,
): void {
  // requestState is a one-time, unguessable continuation handle. Keeping the
  // binding server-side means any edited, expired, unknown, or replayed state
  // is rejected before it can advance a plan.
  const continuations = new Map<string, { planId: string; expiresAt: number }>();
  const decisionSchema = z.object({ decision: z.enum(["approve", "decline"]) });

  server.registerTool("confirm_stock_action_plan", {
    description: "Ask the connected MCP host to collect explicit user approval for the exact simulated plan. Never signs or broadcasts.",
    inputSchema: { plan: z.any() }
  }, async ({ plan }, ctx) => {
    try {
      const trusted = plans.requireExact(plan as ActionPlan, "simulated");
      validate?.(trusted);

      if (!supportsFormElicitation(clientCapabilitiesForRequest(ctx, server))) {
        return blocked("unavailable", trusted, "This MCP host does not advertise support for approval forms. The plan remains simulated.");
      }

      const state = ctx.mcpReq.requestState();
      if (typeof state !== "string") {
        if (ctx.mcpReq.inputResponses && Object.keys(ctx.mcpReq.inputResponses).length) {
          return blocked("invalid_response", trusted, "The host response was not bound to an active confirmation request.");
        }

        const continuation = randomUUID();
        const expiresAt = Math.min(trusted.expiresAt ?? Date.now(), Date.now() + 5 * 60_000);
        continuations.set(continuation, { planId: trusted.planId, expiresAt });
        for (const [key, value] of continuations) if (value.expiresAt <= Date.now()) continuations.delete(key);

        return inputRequired({
          requestState: continuation,
          inputRequests: {
            confirmation: inputRequired.elicit({
              message: buildConfirmationMessage(trusted),
              requestedSchema: {
                type: "object",
                properties: {
                  decision: {
                    type: "string",
                    title: "Review this simulated transaction plan",
                    description: "Choose approve only if the exact plan details below are expected.",
                    enum: ["approve", "decline"],
                    enumNames: ["Approve plan", "Decline"]
                  }
                },
                required: ["decision"]
              }
            })
          }
        });
      }

      const continuation = continuations.get(state);
      continuations.delete(state);
      if (!continuation || continuation.expiresAt <= Date.now() || continuation.planId !== trusted.planId) {
        return blocked("invalid_response", trusted, "The confirmation request expired, changed, or was already used. The plan remains simulated.");
      }

      const response = inputResponse(ctx.mcpReq.inputResponses, "confirmation");
      if (response.kind !== "elicit") {
        return blocked("invalid_response", trusted, "The host did not return a valid decision. The plan remains simulated.");
      }
      if (response.action === "cancel") return blocked("cancelled", trusted, "The user cancelled the host confirmation request.");
      if (response.action === "decline") return blocked("declined", trusted, "The user declined the host confirmation request.");

      const parsed = decisionSchema.safeParse(response.content);
      if (!parsed.success) return blocked("invalid_response", trusted, "The host did not return the required explicit approval choice.");
      if (parsed.data.decision === "decline") return blocked("declined", trusted, "The user declined the simulated plan.");

      // Re-fetch and validate the registered object immediately before the
      // single allowed transition; the continuation cannot substitute a plan.
      const exactPlan = plans.requireExact(plan as ActionPlan, "simulated");
      validate?.(exactPlan);
      const confirmed = confirmPlan(exactPlan);
      plans.advance(exactPlan, "simulated", confirmed, "confirmed");
      return textResult(outcome({
        summary: "The MCP host returned explicit approval; the plan is confirmed, but no signing or broadcast occurred.",
        confirmationStatus: "approved",
        plan: confirmed,
        broadcasted: false
      }, "success", "Continue only with a separate external-wallet signature step", { sideEffects: "external_signature_required" }));
    } catch (error) {
      return textResult({ ...errorOutcome(error, "Simulate the unchanged plan and resolve all blocking checks before confirming", "confirmation_rejected"), broadcasted: false });
    }
  });
}

export function clientCapabilitiesForRequest(ctx: ServerContext, server: McpServer): ClientCapabilities | undefined {
  const envelope = ctx.mcpReq.envelope as Record<string, unknown> | undefined;
  const requestCapabilities = envelope?.[CLIENT_CAPABILITIES_META_KEY] as ClientCapabilities | undefined;
  return requestCapabilities ?? server.server.getClientCapabilities();
}

export function supportsFormElicitation(capabilities: ClientCapabilities | undefined): boolean {
  const elicitation = capabilities?.elicitation;
  return Boolean(elicitation && (elicitation.form !== undefined || elicitation.url === undefined));
}

function blocked(status: ConfirmationStatus, plan: ActionPlan, summary: string) {
  const nextAction = status === "unavailable"
    ? "Reconnect using an MCP host that supports elicitation forms, review the plan, and request confirmation again"
    : "Review the simulated plan; request a fresh confirmation only if the user wants to proceed";
  return textResult(outcome({ summary, confirmationStatus: status, plan, broadcasted: false }, "blocked", nextAction, { sideEffects: "none" }));
}

function buildConfirmationMessage(plan: ActionPlan): string {
  const action = plan.unsignedActions?.[0] as { kind?: string; chainId?: string; payload?: unknown } | undefined;
  const payload = action?.payload as { tx?: { from?: unknown; to?: unknown; value?: unknown } } | undefined;
  const tx = payload?.tx;
  const details = [
    `Operation: ${safeText(plan.intent.type)}`,
    `Input amount: ${safeText(plan.intent.amount)} (decimals: ${safeText(plan.intent.amountDecimals)})`,
    `Input token contract: ${safeText(plan.intent.fromTokenAddress)}`,
    `Wallet: ${safeText(plan.intent.walletAddress)}`,
    `Underlying asset: ${safeText(plan.intent.toAsset.underlyingName)} (${safeText(plan.intent.toAsset.underlyingTicker)})`,
    `Representation: ${safeText(plan.intent.toAsset.tokenSymbol)}; issuer/platform: ${safeText(plan.intent.toAsset.platformId)}`,
    `Asset chain / contract: ${safeText(plan.intent.toAsset.chainId)} / ${safeText(plan.intent.toAsset.contractAddress)}`,
    `Planned action / chain: ${safeText(action?.kind)} / ${safeText(action?.chainId ?? plan.intent.toAsset.chainId)}`,
    `Transaction target: ${safeText(tx?.to)}`,
    `Native transaction value (wei): ${safeText(tx?.value)}`,
    `Provider-reported expected output (raw token units): ${safeText(plan.expectedOutput)}`,
    `Maximum slippage (basis points): ${safeText(plan.intent.maxSlippageBps)}`,
    `Maximum gas budget (BNB): ${safeText(plan.intent.maxGasCostBnb)}`,
    `Plan expiry (UTC): ${safeDate(plan.expiresAt)}`
  ];
  return [
    "Ariadne requests an explicit user decision for this exact simulated action plan.",
    ...details,
    "Approving only advances the registered plan to confirmed. It does not sign, submit, or broadcast a transaction.",
    "The Agent cannot approve by echoing a plan ID. Choose Approve plan only after reviewing these details."
  ].join("\n");
}

function safeText(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "Not supplied";
  const normalized = String(value)
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "Not supplied";
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function safeDate(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not supplied";
  try {
    return new Date(value).toISOString();
  } catch {
    return "Not supplied";
  }
}
