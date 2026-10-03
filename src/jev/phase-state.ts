import { readFile, writeFile } from "node:fs/promises";
import type { ShadowDecisionRecord } from "./types.js";

export type PhaseState = {
  currentPhase: string;
  lastDecisionAt?: string;
  lastTransition?: ShadowDecisionRecord["phaseTransition"];
  nextPhase?: string;
  lastReason?: string;
};

const approvedContinuationSuccessors: Record<string, string> = {
  "official-provider-contract-audit": "source-confirmed-data-fidelity",
  "source-confirmed-data-fidelity": "sdk-mcp-final-acceptance",
  "sdk-mcp-final-acceptance": "delivery-complete",
};

/** Fail closed if a gate attempts to skip or reorder the explicitly approved Phases 27–29. */
export function assertApprovedPhaseSuccessor(phase: string, nextPhase: string): void {
  const expected = approvedContinuationSuccessors[phase];
  if (expected && nextPhase !== expected) {
    throw new Error(`Phase ${phase} may advance only to its approved successor ${expected}; received ${nextPhase}`);
  }
}

export async function advancePhaseState(path: string, record: ShadowDecisionRecord): Promise<PhaseState> {
  const current = await readPhaseState(path);
  const next = record.evidence.nextPhase ?? current.nextPhase;
  const state: PhaseState = {
    // A pause holds the requested phase; it must not leave a stale terminal/previous
    // phase in the ledger when a new approved phase has just started.
    currentPhase: record.phaseTransition === "advance" && next ? next : record.evidence.phase,
    lastDecisionAt: record.recordedAt,
    lastTransition: record.phaseTransition,
    nextPhase: next,
    lastReason: record.transitionReason,
  };
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

async function readPhaseState(path: string): Promise<PhaseState> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as PhaseState;
  } catch {
    return { currentPhase: "uninitialized" };
  }
}
