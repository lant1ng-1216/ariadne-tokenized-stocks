export type ToolOutcomeStatus = "success" | "warning" | "blocked" | "error";

export type ToolOutcome = {
  status: ToolOutcomeStatus;
  nextAction: string;
  warnings: string[];
  sideEffects: "none" | "external_signature_required" | "broadcast_possible";
  error?: { code: string; message: string };
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
  return outcome(
    { summary: message },
    "error",
    nextAction,
    { error: { code, message } }
  );
}

export function textResult(payload: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}
