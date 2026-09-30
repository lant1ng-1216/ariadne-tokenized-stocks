# Mainline pause checkpoint and development-system side track

Date: 2026-09-29

This is an internal handoff note for resuming Ariadne after the separate development-system work. It is not part of the proposed public repository. No Ariadne implementation files are to be copied into that repository.

## Resume update — Phase 6 Jev gate passed (2026-09-29 18:19 UTC)

The checkpoint below captured the state before resuming the mainline. The phase review contract was strengthened to require explicit unique criteria, a complete verdict for every criterion, a hard confidence floor of 0.85, and valid confidence for the selected answer. A targeted signed-transaction evidence review then split payload matching from signer/signature validation and added SDK-level pre-broadcast regressions for chain ID, target, value, and calldata mismatches.

The fresh Phase 6 gate passed all 12 selected deterministic checks. Jev marked all 8 acceptance criteria `met`; overall confidence was `0.900`, above the 0.85 floor. The gate advanced phase state to `local-delivery-readiness` (Phase 7), which is now in progress. The previous 0.300 pause remains part of the historical record; no real wallet, live signing, chain broadcast, deployment, package publication, or other external write was performed.

## Separate development-system track — corrected scope

The system being discussed is a full, reusable development lifecycle, not merely a low-confidence repair loop or a phase gate. It should support both:

- Starting from a brainstorm or chat and turning the agreed intent into a complete PRD, constraints, acceptance criteria, and a phased implementation plan.
- Joining an existing project or long-running task midstream: inspect its artifacts and repository, reconstruct what is done and unresolved, establish evidence and acceptance criteria, then resume without pretending the work started from scratch.

After the overall plan and boundaries are agreed, routine module-by-module human approval should be replaced by a controlled autonomous workflow:

```text
PRD / existing-project intake
  -> scope, phases, dependencies, acceptance criteria, and stop boundaries
  -> implement one phase with durable context
  -> agent self-review and real checks
  -> independent Jev/reviewer assessment against the approved intent
       -> specific, repairable findings: analyze root cause, repair, rerun checks, review again
       -> meets acceptance: record evidence and automatically enter the next approved phase
       -> true blocker / user-only decision / safety boundary: pause with the exact reason
  -> final integration audit, report, and handoff
```

The purpose is to prevent attention drift, shallow implementation, silent scope reduction, and self-certification after only foundational code exists. A review must compare implementation and evidence against the agreed PRD and phase acceptance criteria, not merely accept an agent's “done” label. New findings discovered during repair should be recorded and handled without silently weakening the original criteria. The process needs durable state, resumability, audit history, bounded retries, and an explicit distinction between repairable work and genuine stop conditions.

### Proposed product shape (for discussion; not implemented)

- A model/agent-independent workflow engine and project-state format should own the phase state machine, evidence, retry/review loop, stop policy, and resume behavior. This is the core product; it is not a prompt pack.
- A CLI is the likely first control surface for local development and automation. It can ingest a PRD or existing project, show status, run/resume approved work, and preserve a machine-readable audit trail.
- Agent adapters make the workflow usable from Codex, Claude Code, and potentially other agents. Skills carry repeatable instructions; a Codex/Agent Plugin can package discovery and installation; MCP is optional when agents need structured access to workflow status or controlled operations. None of those packaging formats alone is the durable orchestration engine.
- A reviewer adapter (Jev first, but replaceable) returns structured findings tied to criteria and evidence: pass, repair, ask, or true stop, with reasons and confidence. Jev is a reviewer implementation, not the whole system.
- Ariadne is the primary dogfooding evidence; do not delay release by rebuilding a second proof-of-concept from scratch. Extract the existing workflow instructions, phase-gate/reviewer/state components, and reusable tests, then generalize project-specific assumptions. Keep a small regression suite for the behaviors the system must preserve (repairable findings loop, genuine stop boundaries, and approved phase advancement).
- The intended release is a separate, clean public GitHub repository containing only the reusable workflow system: no Ariadne product source, website, credentials, project-specific records, or unrelated project history. Do not add a hosted service, custom UI, or mandatory MCP server just to create a product-shaped package. This track has not created a repository, published anything, or copied project code.

Human intervention remains for genuinely user-owned choices (ambiguous product direction or changed scope), authorization-sensitive actions, destructive/external/financial actions, and cases where safe bounded diagnosis cannot resolve the blocker. Low reviewer confidence by itself should trigger more diagnosis/evidence or a repair path, not be mislabeled as a failed implementation and not silently authorize phase advancement.

## Why the Ariadne Jev score was 0.300

The latest gate record is `2026-09-29T12:43:57.582Z`. All 12 local checks passed. Jev returned `passed_with_deferred_items` / `continue` / low risk, but confidence was `0.300`; the configured threshold is `0.85`, so the gate correctly kept Phase 6 current and did not start Phase 7.

The exact reason for the 0.300 cannot be recovered from the saved response. Inspection of the current implementation explains the observability gap: the gate sends check names and exit-code summaries rather than detailed artifacts; Jev is asked only three forced-choice classifications; native confidence is collapsed to the minimum of those three values; and `reasons` are currently hard-coded generic text. Therefore we do not know which classification produced 0.300 or what concern Jev had. It would be speculation to claim a specific safety finding.

The gate protects phase advancement, but it does not orchestrate diagnosis and repair. The correct next action after this confidence-only pause is not to lower the threshold or resubmit identical evidence; it is to inspect what evidence/reasons are missing, improve reviewer diagnostics and evidence quality, then repair any actionable finding and rerun the relevant independent review. The earlier response stopped the phase transition but failed to continue this safe diagnosis autonomously; that is a workflow gap to address.

## Ariadne mainline status at pause

- Current phase: `execution-safety-readiness` (Phase 6). `records/phase-state.json` remains here with `lastTransition: pause`; `local-delivery-readiness` (Phase 7) has not begun.
- Phase 6's final local verification ran 12 checks successfully, including build/typecheck, domain and plan-registry validation, signed-transaction/input-balance/gas safety, offline execution rehearsal, guarded SDK execution, core hardening, SDK example, distribution, and diff checks.
- A second independent read-only review passed typecheck, plan-registry, offline execution rehearsal, and diff checks after adversarial snapshot-boundary fixes. The connected MCP read-only NVDA check also restored timestamp/logo parity and continued to report `sideEffects: none`.
- No production wallet, live user signature, funded execution, chain broadcast, deployment, or package publication was used. The dry-run reported `broadcastRequests: 0` and `realWalletUsed: false`; the SDK fixture used a mocked broadcaster only.
- Explicit remaining limits: guarded RFQ/multi-action/native-input flows, durable cross-process replay prevention, and funded settlement/post-trade reconciliation. These are documented deferrals, not evidence that the tested path failed.

## Resume sequence after the side track

1. Resume at Phase 6; do not skip to Phase 7 and do not repeat the identical Jev request.
2. Improve the review contract and evidence path so a low-confidence or repair decision yields criterion-linked findings, missing evidence, and actionable next steps. Preserve the `0.85` threshold; do not use a score alone as a stop condition.
3. Run safe, bounded diagnosis and repair for findings that are within the approved scope; rerun the exact relevant checks and an independent review. Escalate only a true user decision, external prerequisite, safety boundary, or exhausted/no-progress repair loop.
4. Advance to local-delivery readiness only after the configured gate actually returns `advance`; then complete delivery/readiness checks without publishing or deploying absent separate authorization.

## Source of truth

- `records/phase-state.json` — current phase and last gate transition.
- `docs/DEVELOPER_EXPERIENCE_LOG.md` and `docs/TECHNICAL_RESEARCH_REPORT.md` — detailed implementation, checks, prior reviews, gate history, and limitations.
- `docs/JEV_PHASE_GATE.md` — current gate behavior and threshold policy.
- `/Users/Zhuanz/Desktop/Long-Running-Agent-Workflow/docs/OPEN_SOURCE_DEV_WORKFLOW_PLAN.md` — side-track extraction plan.
- `/Users/Zhuanz/Desktop/Long-Running-Agent-Workflow/launch/DEV_WORKFLOW_ORIGIN_STORY.zh-CN.md` — internal social-media narrative draft; not yet approved for publication or inclusion in the public repository.
