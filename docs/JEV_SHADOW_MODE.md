# Jev Shadow Mode

Jev is used only inside the Ariadne repository as an experimental development-decision layer. It does not modify, configure, or control Codex.

## Current boundary

This first integration is shadow-only:

- the deterministic baseline remains authoritative;
- Jev is optional and is called with `JEV_AGENT_KEY` when present; Vercel AI Gateway is the fallback when only `AI_GATEWAY_API_KEY` is present;
- Jev output is recorded beside the baseline for agreement analysis;
- no result can automatically edit source files, sign a wallet transaction, broadcast, publish, or push Git changes;
- a low-risk phase transition may update only the Ariadne-local phase-state record when baseline and Jev agree above the configured confidence threshold;
- if Jev is unavailable, the baseline continues to work.

## Decision contract

The decision is constrained to:

- `status`: `passed`, `passed_with_deferred_items`, `needs_rework`, or `blocked`;
- `nextAction`: `continue`, `repair`, `ask_user`, or `stop`;
- `riskLevel`: `low`, `medium`, or `high`;
- a confidence value and evidence-backed reasons.

The implementation is deliberately fail-closed for external or high-risk actions. Shadow mode records a decision but always reports `actionTaken: none`.

When both the deterministic baseline and Jev return a low-risk continuation, every explicitly supplied acceptance criterion receives a sufficiently confident `met` verdict, deferred work is explicitly assessed as non-blocking, there are no blocked items or external write requests, and overall Jev confidence meets the hard minimum of `0.85`, the runner records `phaseTransition: advance` and updates the local phase-state file. Every gate must include unique acceptance criteria; missing or incomplete reviews fail closed. `JEV_MIN_CONFIDENCE` may raise the threshold but cannot lower it. Otherwise the runner records `pause`. This transition does not modify Codex or execute code; it only records the Ariadne development phase state.

## Local validation

```bash
npm run test:jev-shadow
```

Without either key, this validates the deterministic fallback and the no-action boundary. With `JEV_AGENT_KEY`, it uses the native Jev endpoint. With `AI_GATEWAY_API_KEY`, it uses Vercel AI Gateway. Either live path only records the Jev response for comparison; it still does not authorize any workflow action.

The first live Gateway attempt may still be rejected if the Vercel team has no valid payment method on file. This is an account-level Gateway requirement, even when the Jev model page and free-credit tier show no model charge. The client treats that response as an unavailable Jev backend and preserves the deterministic fallback.
