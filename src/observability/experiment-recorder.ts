import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { RequestObservation } from "../binance-web3-client.js";

export type ResponseClass = "success" | "retryable_rate_limit" | "upstream_error" | "network_error" | "http_error";
export type HandlingDecision = "return_normalized" | "retry" | "preserve_error" | "block" | "external_signature";

export type ExperimentRecord = {
  record_id: string;
  observed_at: string;
  scenario_id: string;
  endpoint: string;
  request_variant: string;
  http_status?: number;
  business_code?: string | number;
  response_class: ResponseClass;
  latency_ms: number;
  attempt: number;
  retry_after_honored?: boolean;
  handling_decision: HandlingDecision;
  warning_count: number;
  blocking_reasons?: string[];
  signature_required?: boolean;
  broadcasted: false;
  source_ref: string;
};

export function classifyObservation(observation: RequestObservation): Pick<ExperimentRecord, "response_class" | "handling_decision"> {
  const code = String(observation.code ?? "");
  if (observation.success && code === "0") return { response_class: "success", handling_decision: "return_normalized" };
  if (code === "429" || code === "42900") return { response_class: "retryable_rate_limit", handling_decision: "retry" };
  if (observation.status !== undefined && observation.status >= 500) return { response_class: "upstream_error", handling_decision: "preserve_error" };
  if (observation.status === 0 || code === "NETWORK_TIMEOUT") return { response_class: "network_error", handling_decision: "preserve_error" };
  return { response_class: "http_error", handling_decision: "preserve_error" };
}

export function recordFromObservation(input: {
  scenarioId: string;
  requestVariant: string;
  observation: RequestObservation;
  sourceRef: string;
  recordId?: string;
}): ExperimentRecord {
  return {
    record_id: input.recordId ?? `${input.scenarioId}-${input.observation.attempt}-${Date.now()}`,
    observed_at: new Date().toISOString(),
    scenario_id: input.scenarioId,
    endpoint: input.observation.path.split("?", 1)[0] ?? input.observation.path,
    request_variant: input.requestVariant,
    http_status: input.observation.status,
    business_code: input.observation.code,
    ...classifyObservation(input.observation),
    latency_ms: input.observation.durationMs,
    attempt: input.observation.attempt,
    retry_after_honored: input.observation.rateLimitHeaders ? Object.keys(input.observation.rateLimitHeaders).some((key) => key.toLowerCase() === "retry-after") : undefined,
    warning_count: 0,
    broadcasted: false,
    source_ref: input.sourceRef,
  };
}

export async function appendExperimentRecord(path: string, record: ExperimentRecord): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
}
