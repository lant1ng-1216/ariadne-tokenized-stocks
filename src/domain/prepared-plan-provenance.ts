import type { ActionPlan } from "./types.js";
import { jsonDataFingerprint } from "./json-snapshot.js";

const preparedSnapshots = new WeakMap<ActionPlan, string>();

/** Record the exact in-memory plan produced by SDK preparation. */
export function markSdkPreparedPlan(plan: ActionPlan): void {
  preparedSnapshots.set(plan, jsonDataFingerprint(plan));
}

/** Require the same untouched plan object issued by this process's SDK preparation flow. */
export function assertSdkPreparedPlan(plan: ActionPlan): void {
  const issuedSnapshot = preparedSnapshots.get(plan);
  let submittedSnapshot: string;
  try {
    submittedSnapshot = jsonDataFingerprint(plan);
  } catch {
    throw new Error("Guarded execution requires an unchanged SDK-prepared plan with plain JSON data");
  }
  if (!issuedSnapshot || issuedSnapshot !== submittedSnapshot) {
    throw new Error("Guarded execution requires the unchanged plan object returned by SDK preparation in this process");
  }
}
