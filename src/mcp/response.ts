import { sanitizeProviderResponseDiagnostics, type ProviderResponseDiagnostics } from "../provider-response-diagnostics.js";
import { BinanceWeb3Error } from "../errors.js";

export type ToolOutcomeStatus = "success" | "warning" | "blocked" | "error";

export type ToolOutcome = {
  status: ToolOutcomeStatus;
  nextAction: string;
  warnings: string[];
  sideEffects: "none" | "external_signature_required" | "broadcast_possible";
  error?: { code: string; message: string; diagnostics?: ProviderResponseDiagnostics };
};

export function outcome<T extends Record<string, unknown>>(
  payload: T,
  status: ToolOutcomeStatus,
  nextAction: string,
  options: Partial<Pick<ToolOutcome, "warnings" | "sideEffects" | "error">> = {}
): T & { outcome: ToolOutcome } {
  return {
    ...payload,
    outcome: {
      status,
      nextAction,
      warnings: options.warnings ?? [],
      sideEffects: options.sideEffects ?? "none",
      ...(options.error ? { error: options.error } : {})
    }
  } as T & { outcome: ToolOutcome };
}

export function errorOutcome(error: unknown, nextAction: string, code = "tool_error") {
  const message = error instanceof Error ? error.message : String(error);
  const diagnostics = error instanceof BinanceWeb3Error
    ? sanitizeProviderResponseDiagnostics(error.responseDiagnostics)
    : undefined;
  return outcome(
    { summary: message },
    "error",
    nextAction,
    { error: { code, message, ...(diagnostics ? { diagnostics } : {}) } }
  );
}

export function textResult(payload: Record<string, unknown>, options: { structuredContent?: boolean; text?: string } = {}) {
  return {
    content: [{ type: "text" as const, text: options.text ?? JSON.stringify(payload, null, 2) }],
    ...(options.structuredContent ? { structuredContent: payload } : {})
  };
}
