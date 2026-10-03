# Jev phase gate for Ariadne development

Jev is enabled as a **review checkpoint** between already approved, low-risk development phases. It does not execute work or grant authorization by itself. Codex runs actual tests, sends a concise, non-sensitive evidence summary tied to the approved phase criteria, records the decision, and continues the next in-scope phase only when both the deterministic baseline and Jev return a low-risk continuation at a confidence threshold of at least `0.85`.

For risk classification, a read-only request to an already approved, in-scope endpoint may remain low risk when it is explicitly bounded, uses configured credentials, avoids private and wallet data, and causes no state change or intentional paid operation. Unapproved endpoints/providers, sensitive data, costs, wallet transaction signing, broadcasts, writes and deployments are not covered by this allowance; assess them at the appropriate higher risk and stop at the authorization boundary.

Example:

```bash
npm run jev:gate -- \
  --phase agent-natural-language-repair \
  --next web-consistency-repair \
  --objective "Read-only Agent research accepts a Chinese NVDA request and retains warnings" \
  --check typecheck \
  --check test:agent-model \
  --check test:demo-mode \
  --criterion '{"id":"natural-language-request","requirement":"A Chinese NVDA request resolves to read-only research without triggering a trade.","checkNames":["test:agent-model","test:demo-mode"],"evidenceSummary":"The selected tests cover Chinese request normalization and demo-mode research; their assertions verify no trade side effects."}'
```

At least one `--criterion` is mandatory for every phase gate, and every material acceptance requirement for that phase should have its own criterion. It takes one JSON object with a unique stable `id`, the approved requirement, selected `checkNames`, and a concise `evidenceSummary` that explains what the checks actually establish. Every linked check must also be selected with `--check`. Keep claims factual and bounded: a test's name or green exit code alone is not proof of behavior. Do not weaken or rewrite the PRD/phase requirement to obtain approval. At most 12 criteria, 12 linked checks per criterion, and 12 blocked/deferred notes can be submitted in a single review. Text is length-limited and screened for multiline or secret-like content before it is sent to Jev or recorded.

Use `--blocked "..."` for a known blocking condition and `--deferred "..."` only for a genuinely non-blocking later item. Jev returns a verdict and confidence per criterion, and an explicit assessment of whether deferred work affects the current phase. If evidence is insufficient, a criterion has a gap, or confidence is low, the gate records which review item needs attention. Low confidence by itself is **not** proof that implementation failed and is not a reason to abandon the workflow: diagnose or improve the relevant evidence, repair in-scope issues, rerun the affected checks, and request a meaningfully improved review. Keep the confidence threshold at `0.85`; do not resubmit the same evidence unchanged as a substitute for diagnosis.

The gate accepts only an allowlist of deterministic, non-transactional npm scripts. Criteria must have unique IDs, and Jev must return one sufficiently confident `met` verdict for every criterion; missing or incomplete review coverage fails closed. Deferred items also require an explicit non-blocking assessment. `JEV_MIN_CONFIDENCE` may make review stricter, but invalid values or values below `0.85` resolve to the hard minimum `0.85`; configuration cannot lower it. If a Gateway response omits the probability for its selected answer, that answer's confidence is treated as zero rather than borrowed from another class.

For the approved Phase 27–29 continuation, the runner additionally validates the requested successor before running checks: `official-provider-contract-audit` → `source-confirmed-data-fidelity` → `sdk-mcp-final-acceptance` → `delivery-complete`. A syntactically valid but skipped/reordered successor is rejected before Jev review or phase-state mutation. `test:jev-shadow` covers both allowed transitions and representative skip/escape attempts.

Never submit credentials, wallet/private-key material, personal information, raw logs, or large artifacts; retain full evidence locally and provide only a carefully reviewed summary. The run appends a JSONL record under `records/`, updates the phase-state file and appends an interim note to the technical and product-experience reports. `advance` means Codex may proceed to the named next step within the user's prior authorization; `pause` means follow the recorded diagnostic next step, or ask for direction only when a genuine user-owned decision or safety boundary is reached. An unavailable Jev fails closed and does not silently use the deterministic baseline as approval.

The gate is invoked by the working Codex task; it is not an always-running daemon and does not schedule a new task. A passing gate certifies only the evidence supplied to it. Natural-language Agent behavior, direct web usability and subjective design quality require their own observations and cannot be inferred from typecheck alone. No gate verdict permits a live wallet transaction, public deployment, external write, scope change or irreversible action.
