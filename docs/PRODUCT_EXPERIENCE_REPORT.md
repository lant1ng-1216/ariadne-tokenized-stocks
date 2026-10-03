# Ariadne Product Experience Issues and Improvement Record

<!-- JEV-LATEST-GATE-SUMMARY:START -->
#### Latest Jev gate snapshot (automatically synchronized)
- Canonical record: `2026-10-03T10:50:42.287Z`; phase `sdk-mcp-final-acceptance`; Jev confidence `0.880` (required floor: `0.850`).
- Result: `advance`; selected checks `25/25` passed; criteria `12/12` met; deferred assessment `non_blocking` (5 items; exact text is retained in both gate appendices).
- Criterion scores: sdk-consumer-package=1.000 (met); provider-field-fidelity=0.990 (met); mcp-output-native-ui-parity=0.970 (met); natural-language-catalog-resolution=0.990 (met); fail-closed-execution-safety=0.960 (met); standalone-sdk-docs-example-contract=0.990 (met); agent-mcp-config-snippets=1.000 (met); provider-unknowns-remain-explicit=0.880 (met); phase-sequence-and-terminal-ledger=0.930 (met); latest-report-appendix-integrity=0.930 (met); single-current-summary-source=0.970 (met); terminal-local-scope-only=0.900 (met).
- Criterion scores below `0.850`: none.
- Phase ledger: `currentPhase=delivery-complete`, `nextPhase=delivery-complete`, `lastTransition=advance`, `lastDecisionAt=2026-10-03T10:50:42.287Z`; reason: Baseline and Jev agree on a low-risk continuation.
<!-- JEV-LATEST-GATE-SUMMARY:END -->

Updated: 2026-10-03

## 2026-10-03 — Current SDK/MCP acceptance state

Phase 28 is complete at Jev confidence **0.890** after 15/15 selected checks and all nine criteria were `met`; it automatically advanced to Phase 29. The earlier Phase 28 confidence pauses at **0.350** and **0.690** are preserved in the review history and were resolved without changing the **0.850** gate threshold.

Phase 29 local SDK/MCP acceptance is complete; Jev advanced to `delivery-complete` at **0.850** after 25/25 selected checks and all 12 criteria met the unchanged floor. The current snapshot above is synchronized from the canonical ledger, and chronological gate appendices preserve each review, evidence, diagnosis and outcome. This is local product acceptance—not website completion, a public release, universal third-party Agent behavior, or funded execution.

The clean-room SDK package install/import, developer configuration checks, Agent-facing research outputs, native MCP view, and safety regressions have passed locally. These are local automated checks, not a claim that third-party Agents universally select tools or that other hosts render identically. No real provider request, website validation, push, publication, deployment, wallet signing, broadcast or settlement is part of this phase. Before every Jev review, the exact prior decision is reconciled; after Jev responds, the gate refreshes the current snapshot before another review.

## 2026-10-02 — Bilingual MCP output and final local acceptance approved

Phase 22 is Jev-approved at **0.930** after 11/11 selected checks passed and all five criteria were `met` (0.940 / 0.960 / 0.930 / 0.940 / 0.970). After the first review paused at 0.810, a focused fixture now asserts in both English and Chinese that token price and reference price are labeled distinctly, update time remains distinct from provider response time, unknown status stays unknown, missing liquidity stays absent rather than becoming zero, and the evidence survives briefs and the native research card. Explicit no-trade wording also suppresses quote and wallet follow-up actions.

Phase 23, the last approved local SDK/MCP acceptance phase, is complete. Its first two Jev reviews paused at **0.670** and **0.590** despite 24/24 checks passing; the repairs added live English MCP research/no-trade assertions, cross-document ledger checks, and an installed-package `search → marketContext` journey against a loopback-only synthetic fixture. The third full gate passed all 24 checks and Jev approved at **0.900**: SDK consumption **1.000**, MCP **0.930**, safety **0.990**, reconciliation **0.900**, terminal scope **0.920**; all five criteria were `met`, above the unchanged 0.850 threshold. The phase ledger now records terminal `delivery-complete`. This is local SDK/MCP completion only. Provider inventory/freshness and broader cross-host visual parity remain deferred; website work, npm/public release, deployment, real-wallet execution and funded settlement were not part of this approval.

## 2026-10-01 — Approved core-product continuation

The user approved Phases 18–23 as a bounded sequence with Jev review and automatic advancement only after checks and criteria pass. Post-reconnect, the current connected MCP catalog exposes `confirm_stock_action_plan(plan)`, superseding the earlier observation of `confirmationToken`; this is schema evidence only. The isolated stdio MCP fixture passed a synthetic form-elicitation/decline round trip and confirmed the fixture stays simulated with no network, wallet, signing, or broadcast path. A subsequent connected-host call returned `unavailable` and the synthetic plan remained `simulated`; no form was shown. Review found the handler hid whether the host had not advertised form capability or the request failed after negotiation. The local handler now distinguishes those cases without returning raw exception text; all focused tests, typecheck, build and the phase-plan check pass. The test-server entry was removed after the first host attempt, then re-added following the diagnostic repair; a fresh desktop reconnect is now needed to observe the negotiated capability and updated status. Phase 18's previous Jev gate returned `blocked` at 0.480 (local fixture 0.990; actual-host form evidence 0.610). Website work, push/publication, deployment, paid services and real-wallet execution remain excluded.

## 2026-10-02 — Phase 21 provider-data experience update (Jev approved; Phase 22 active)

The read-only asset/research service had been converting several documented Binance market states into `unknown`. The local mapper now represents `premarket`, `postmarket`, and `overnight` as `offhours`, and `pause` as `closed`; unknown future values remain explicitly unknown. On the latest paired live snapshot, the directory returned 488 unique representations while platform metadata declared 545 BSC records; 411 rows mapped to off-hours, 31 to closed, and 46 lacked a market-status string. This improves status expression in Agent output without claiming the catalog is complete or every listing is tradable.

The directory still has no per-representation price-update timestamp or liquidity field. A separate NVDA price sample matched both issuer representations and included per-token update times, but no freshness threshold is defined. A full six-request probe succeeded once; the subsequent bounded repeat was partial because the NVDA search timed out. Both outcomes remain visible as distinct evidence. Jev approved Phase 21 at **0.970** after all ten selected checks and five criteria passed, and the gate advanced to Phase 22. This does not resolve the provider gaps or imply investment advice, signature, broadcast, or external write.

## Purpose

## First-use experience update

The primary first-use path is now natural language rather than memorizing MCP tool names. A new user can launch Demo Mode without credentials or funds and ask for a tokenized-stock research brief. The Agent can select `research_tokenized_stock`, which returns issuer representations, market context, warnings, comparison evidence and a safe next action in one response. Live Mode uses the same interaction pattern after the user supplies their own API credentials.

The interface remains explicit at the execution boundary: research is read-only, recommendations are not investment advice, and quotes, signatures, transactions and broadcasts are separate later steps.

The presentation layer now uses a research-brief hierarchy: an at-a-glance count and warning summary, a cross-issuer comparison, issuer-specific evidence cards, and a final execution-boundary statement. This is intended to make the interaction feel like an AI-native research surface rather than a serialized API response.

The local website is no longer a monolithic test page. Home establishes the product thesis and prioritizes the SDK and MCP; separate SDK and MCP pages explain the builder and Agent paths; Assets provides a browseable directory; Research, Portfolio and Quote provide focused direct-user workflows. The same interaction core and read-only contracts remain behind every surface.

The directory preserves two visual identities for every representation: the underlying asset logo is primary and the issuance-platform logo is shown as a smaller badge. Both originate from explicit RWA/platform metadata. Demo Mode uses a deterministic catalog, while Live Read-only Mode returned 488 BSC representations during regression testing.

The local web surface now adds a second direct-user path for public-address wallet context. A user can enter a public BSC address after the research view, receive matched and unmatched holdings, and see whether a holding has a usable price. The interface explicitly states that no private key, signature or broadcast is involved. This makes portfolio context a visible product capability without pretending that an unresolved token symbol is a verified tokenized-stock identity.

The next step is now represented directly in the web surface as a read-only quote preview. The user must choose an issuer rather than letting Ariadne silently select between wrappers. The result shows expected output, price impact, venue and whether minimum output was supplied. The UI and API explicitly distinguish this quote from an ActionPlan, approval transaction, signature or broadcast.

This document records the observed onboarding and Agent-interaction issues for Ariadne. It is intended to support future development, the Developer Experience Report and the Technical Research Report. It distinguishes observed facts from hypotheses and planned work.

## 1. Product positioning

Ariadne is AI-native interaction infrastructure for onchain finance. Its core TypeScript SDK and MCP server connect existing Agents, developers and institutional systems to tokenized equities and RWA through one issuer-aware identity, research and execution model. The direct web product exposes the same capabilities to users who prefer not to operate through an Agent. Ariadne does not attempt to replace Codex, Claude Code or another general Agent.

## 2. Issue 1: onboarding requires too much local setup

### Observed workflow

A new user currently needs to:

1. Clone the GitHub repository;
2. Install Node dependencies;
3. Create a local `.env` file;
4. Obtain Binance Web3 API credentials;
5. Configure the Agent's MCP settings;
6. Replace a local absolute path;
7. Restart or refresh the Agent;
8. Only then perform the first query.

### Product impact

- The first value demonstration happens too late.
- Users must understand MCP, API credentials, stdio servers and local paths.
- Reviewers and first-time developers cannot quickly evaluate the product.
- The current path is developer-oriented rather than product-oriented.

### Improvement roadmap

#### Phase A: direct launch

- Publish an npm package;
- support a direct `npx -y ariadne-tokenized-stocks` launch path;
- remove the need to clone the repository and install dependencies manually.

#### Phase B: Demo Mode

- Start new users in a credential-free Demo Mode;
- use public or deterministic demonstration data;
- allow discovery, comparison and simulation only;
- prohibit signing, broadcasting and real settlement.

#### Phase C: Live Mode

- Request Binance API credentials only after the first successful demo;
- enable live market data and quotes;
- retain the external wallet signing and broadcast boundaries.

#### Phase D: hosted distribution

- Provide a hosted MCP endpoint;
- handle authentication through login, OAuth or managed credentials;
- let users configure a remote MCP URL instead of a local process.

#### Phase E: ecosystem distribution

- Publish to an MCP Registry;
- provide one-click or guided installation for Codex, Claude Code and VS Code;
- offer distinct paths for end users, developers and institutions.

Reference implementations in the MCP ecosystem commonly use direct `npx`/`uvx` launch commands, registry discovery or client-level installation flows rather than requiring users to clone a source repository first. See the [MCP reference servers](https://github.com/modelcontextprotocol/servers), [MCP Inspector documentation](https://github.com/modelcontextprotocol/docs/blob/main/docs/tools/inspector.mdx) and [GitHub Copilot MCP installation documentation](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers).

## 3. Issue 2: first Codex test exposed latency and presentation gaps

### Test prompt

```text
Call resolve_tokenized_stock from ariadne-tokenized-stocks and query NVDA on chain 56.
```

### Observed result

- Two tokenized-stock representations were found;
- Ondo `NVDAon` was returned;
- bStocks `NVDAB` was returned;
- contract addresses were preserved;
- no signing, transaction or broadcast occurred;
- the final Agent summary reported no warnings and no side effects.

### Confirmed conclusions

- The MCP connection works;
- `resolve_tokenized_stock` is callable from Codex;
- platform, symbol and contract identity remain visible;
- the safety boundary was not bypassed;
- the Agent can interpret and summarize the Ariadne response.

### Open questions

#### Response latency

The Codex interaction displayed approximately three minutes for a read-only lookup. The current evidence does not identify the dominant contributor. Candidate contributors include:

- MCP server startup;
- Binance API latency;
- local network or proxy behavior;
- MCP transport and result transfer;
- additional Agent reasoning and summarization.

The next tests must separate these components using request observations and client-visible timing.

### Decomposed latency result

Three local read-only repetitions produced the following measurements:

| Layer | Observed range |
|---|---:|
| Direct SDK asset search | 259–621 ms |
| Direct SDK market context | 841–944 ms |
| MCP startup and connection | 363 ms |
| MCP asset search | 262–571 ms |
| MCP market context | 405–836 ms |

The raw measurements are stored in [`research/data/latency-decomposition.json`](../research/data/latency-decomposition.json).

### Current interpretation

The SDK, Binance API requests and MCP tool calls all complete in the millisecond-to-one-second range. They therefore cannot explain the approximately one-to-three-minute durations displayed in Codex. The next investigation should focus on Codex tool scheduling, Agent reasoning and final-answer generation rather than immediately changing the Binance request layer.

The current harness cannot measure internal Codex time directly. User-side timestamps, expanded tool-call timing and client logs are required for the remaining attribution.

#### Response transparency

Ariadne now returns a structured `outcome` envelope containing:

- `status`;
- `nextAction`;
- `warnings`;
- `sideEffects`.

The Codex summary exposed the meaning as “no warnings, no side effects” but did not display the full `outcome` fields. This must be investigated as either:

- normal Agent summarization;
- MCP-client presentation behavior;
- or a response-contract issue requiring further refinement.

## 4. Second-test protocol

After the successful asset-resolution call, run:

```text
Continue with Ariadne and retrieve market context for the bStocks NVDA asset found above.
Show explicitly:
- token price
- reference price
- price gap
- market status
- open state
- data warnings
- outcome.status
- outcome.nextAction
- outcome.sideEffects
Do not create an action plan, sign anything or broadcast anything.
```

This test evaluates:

- continuity across multiple tool calls;
- whether market-context latency is also excessive;
- completeness of the returned fields;
- whether the Agent can expose the structured outcome;
- whether a read-only multi-step workflow feels natural.

## 5. Second-test result

### Observed result

The second market-context test completed successfully. Codex explicitly displayed:

- token price: `221.0919251914703135358`;
- reference price: `220.92`;
- price gap: `0.1719251914703135358`;
- market status: `unknown`;
- open state: `true`;
- two data warnings;
- `outcome.status`: `warning`;
- `outcome.nextAction`: `Review warnings before creating a plan`;
- `outcome.sideEffects`: `none`.

No action plan was created, and nothing was signed or broadcast.

### Confirmed conclusions

- Multi-turn context was preserved;
- the market-context tool was callable;
- the structured `outcome` fields can be displayed when explicitly requested;
- the Agent correctly communicated warnings and side-effect boundaries;
- structured-result visibility is prompt-dependent rather than categorically unavailable.

### Newly prioritized issues

1. **Response latency: high priority.** This interaction took approximately 1 minute 9 seconds. It improved from the first interaction's approximately 3 minutes, but remains too slow for a read-only lookup. MCP startup, API, network and Agent-processing time must be measured separately.
2. **Market-state semantics: medium priority.** `openState: true` and `marketStatus: unknown` can coexist, but the user-facing explanation must say that the platform's open-state field is true while the normalized market status remains unknown. It must not be presented as an unqualified “market open” conclusion.
3. **Price-gap presentation: medium priority.** The current `price gap` is an absolute difference. The interface should also expose the percentage difference so users can interpret a premium or discount more easily.

## 6. Current conclusion

Ariadne's core capability path is usable, but the product remains in a state where the functional prototype is ahead of the onboarding and presentation experience. The immediate priority should be reducing first-use friction, locating the latency source, improving multi-turn Agent interaction and making structured outcomes more transparent. Adding more trading tools is not the immediate priority.

## 7. Recording principles

- Keep observations, hypotheses and open questions separate.
- Never describe simulation, preview or local tests as successful live settlement.
- Do not treat one interaction as a production-performance conclusion.
- Every improvement must have a corresponding test and regression check.
- Real signing, broadcast and funded post-trade verification remain deferred.

### Jev phase-gate record — 2026-09-21T18:33:05.258Z
- Phase: `fixture-readonly-validation`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `49 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Phase 18 direct connected-host attempt — 2026-10-01

- The refreshed connected catalog exposed `confirm_stock_action_plan(plan)`, matching the local confirmation handler.
- The temporary isolated test server returned a synthetic-only TESTB plan; its metadata confirmed zero network requests and no real wallet, signing or broadcast support.
- The connected confirmation call returned `confirmationStatus: unavailable` because the host could not provide the required form. The follow-up status tool confirmed `simulated`. No UI form was displayed and this was not a user decline.
- The local stdio MCP regression still passes for a client that advertises form elicitation, including explicit decline with the plan left simulated. That protocol test does not prove connected-host UI support.
- The temporary Codex config entry was removed after the attempt. No wallet operation, signature, broadcast, or phase transition occurred. Phase 18 remains active pending a decision on whether to retain this host limitation or pursue an alternative interaction path.

## 2026-09-30 — Asset-directory data quality (Phase 9; Jev review pending)

- Directory counts now say “Ticker values / 不同代码值,” not “Underlyings,” because the UI has only exact source ticker strings and no canonical security identifiers.
- The browser loads one consistent, bounded directory snapshot instead of requesting the full provider list again for every local page. A cap warning is shown if the bounded response would be partial; the displayed count does not claim market-wide completeness.
- The current table page requests timestamped prices only for visible representations and joins them by chain, issuer/platform and contract. Single-representation rows show the provider quote time or an explicit unavailable/unverified/not-supplied state. An independent review caught and led to a repair: old directory prices are no longer shown as if refreshed when a quote is missing, and a price gap is calculated only from token and reference prices in the same timestamped snapshot. Grouped rows show how many displayed representations have verified timestamps; partial groups summarize only those verified quotes.
- Demo prices remain labeled demo data. Catalog response time and per-token quote-update time stay separate. Prices remain source information, not an executable quote; unknown data is not represented as zero.

### Jev phase-gate record — 2026-09-21T18:33:47.622Z
- Phase: `fixture-readonly-validation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.910`
- Agreement: `true`
- Latency: `2484 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must return passed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T18:34:50.053Z
- Phase: `ux-phase-01`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.980`
- Agreement: `true`
- Latency: `845 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T18:34:51.651Z
- Phase: `real-transaction-validation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `ask_user` / risk `high`
- Jev: `passed` / `ask_user` / risk `high` / confidence `0.850`
- Agreement: `false`
- Latency: `1320 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must return passed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T18:38:29.329Z
- Phase: `core-capability-hardening`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.880`
- Agreement: `true`
- Latency: `1285 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T18:45:50.811Z
- Phase: `agent-native-workflow-expansion`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.330`
- Agreement: `true`
- Latency: `1130 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must return passed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T18:46:14.214Z
- Phase: `agent-native-workflow-expansion`
- Jev provider: `deterministic-fallback`
- Baseline: `passed` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `95 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T18:46:26.915Z
- Phase: `agent-native-workflow-expansion`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.940`
- Agreement: `true`
- Latency: `850 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T18:47:45.252Z
- Phase: `agent-native-workflow-expansion`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.930`
- Agreement: `true`
- Latency: `867 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T18:49:17.521Z
- Phase: `evidence-and-report-synchronization`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `1.000`
- Agreement: `true`
- Latency: `894 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T18:50:07.079Z
- Phase: `final-local-review`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `ask_user` / risk `high`
- Jev: `passed_with_deferred_items` / `ask_user` / risk `high` / confidence `0.780`
- Agreement: `true`
- Latency: `819 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must return passed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T19:08:58.517Z
- Phase: `distribution-readiness`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `ask_user` / risk `high`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.390`
- Agreement: `false`
- Latency: `1800 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must return passed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T19:19:47.923Z
- Phase: `cleanroom-consumer-validation`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.980`
- Agreement: `true`
- Latency: `1576 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T19:19:48.887Z
- Phase: `release-decision`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `ask_user` / risk `high`
- Jev: `passed_with_deferred_items` / `ask_user` / risk `high` / confidence `0.940`
- Agreement: `true`
- Latency: `688 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must return passed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T19:34:30.818Z
- Phase: `product-presentation-upgrade`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `1057 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T19:35:30.456Z
- Phase: `hosted-mcp-feasibility`
- Jev provider: `deterministic-fallback`
- Baseline: `passed` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `92 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T19:35:45.143Z
- Phase: `hosted-mcp-feasibility`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.890`
- Agreement: `true`
- Latency: `1049 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T19:49:19.898Z
- Phase: `hosted-demo-poc`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.920`
- Agreement: `true`
- Latency: `888 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T19:49:20.255Z
- Phase: `hosted-deployment-decision`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `ask_user` / risk `high`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `90 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-21T19:49:39.919Z
- Phase: `hosted-deployment-decision`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `ask_user` / risk `high`
- Jev: `passed_with_deferred_items` / `ask_user` / risk `high` / confidence `0.500`
- Agreement: `true`
- Latency: `926 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must return passed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

## UX upgrade validation — 2026-09-22

### Scope

This iteration addressed the product issues observed in Codex testing: output that looked too close to a raw API wrapper, Markdown tables that could collapse in an Agent client, ambiguous coverage of identity versus market data, and the inability to separate Ariadne execution time from Agent reasoning time.

### Implemented changes

- Replaced high-level comparison tables with stable, numbered representation entries. Each entry keeps issuer, token, full contract, observed price, reference price, price gap, market status and evidence coverage together.
- Added explicit coverage semantics: `confirmed` or `partial` identity, plus `fetched`, `not_requested` or `unavailable` market context.
- Added a productized next-step list with explicit read-only boundaries and issuer selection requirements.
- Added `timing` to the one-call research workflow. The timing covers search, market-context retrieval, comparison and presentation inside Ariadne; Agent reasoning and final answer rendering are explicitly excluded.
- If a high-level market-context request fails, Ariadne preserves the verified asset identity and reports the market context as unavailable instead of guessing or discarding the asset.
- Kept logo fields provenance-bound. When verified logo metadata is absent, the output says so rather than fabricating an image URL.

### Validation evidence

| Check | Result |
|---|---|
| TypeScript typecheck | PASS |
| Presentation contract test | PASS |
| Agent data-model test | PASS |
| Core hardening and Demo Mode tests | PASS |
| Hosted Demo health, remote MCP connection and read-only workflow | PASS |
| Live MCP regression | PASS; 18 tools registered; plan, simulation, confirmation and broadcast rejection boundaries preserved |

### Interpretation

The product output is now a structured evidence surface rather than a Markdown table that depends on client rendering. Identity-only queries visibly state that market context was not requested. Research workflows visibly distinguish fetched data from missing data, provide explicit safe next steps and expose product-path timing without claiming to measure Codex reasoning.

### Deferred items

- Public Hosted MCP deployment remains intentionally paused until authentication, tenant isolation, rate limiting and operational monitoring are designed and reviewed.
- Verified issuer and underlying-asset logos remain dependent on stable metadata sources from the upstream data model.
- User-side Agent timing still requires client-level observation; Ariadne cannot measure internal Agent reasoning from inside the MCP server.
- Real wallet signing, funded broadcast and post-trade balance validation remain deferred until the user intentionally supplies funds and authorization.

### Jev phase-gate record — 2026-09-22T13:45:55.076Z
- Phase: `product-experience-ux-upgrade`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.960`
- Agreement: `true`
- Latency: `1021 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T14:59:26.657Z
- Phase: `web-research-workspace-contract`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.970`
- Agreement: `true`
- Latency: `1809 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must return passed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T15:01:02.837Z
- Phase: `web-research-workspace-contract`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.960`
- Agreement: `true`
- Latency: `1272 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T15:08:46.318Z
- Phase: `web-research-workspace-ui`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.840`
- Agreement: `true`
- Latency: `1125 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the configured threshold.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T15:22:33.762Z
- Phase: `metadata-and-provenance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.950`
- Agreement: `true`
- Latency: `1562 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T15:25:46.783Z
- Phase: `controlled-live-readonly-backend`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.370`
- Agreement: `true`
- Latency: `1233 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the configured threshold.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T15:26:36.659Z
- Phase: `controlled-live-readonly-backend`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.740`
- Agreement: `true`
- Latency: `1235 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the configured threshold.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T15:32:43.030Z
- Phase: `readonly-observability-boundary`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.950`
- Agreement: `true`
- Latency: `4194 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T15:45:37.735Z
- Phase: `richer-comparison-interactions`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.930`
- Agreement: `true`
- Latency: `2263 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T15:53:55.382Z
- Phase: `wallet-exposure-readonly`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.950`
- Agreement: `true`
- Latency: `2299 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T15:59:46.468Z
- Phase: `read-only-quote-flow`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.980`
- Agreement: `true`
- Latency: `3525 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T16:03:02.622Z
- Phase: `product-docs-consistency`
- Jev provider: `deterministic-fallback`
- Baseline: `passed` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `271 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T16:03:25.098Z
- Phase: `product-docs-consistency`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.960`
- Agreement: `true`
- Latency: `2099 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T16:06:43.181Z
- Phase: `final-local-review-before-public-sync`
- Jev provider: `deterministic-fallback`
- Baseline: `passed` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `530 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T16:07:03.813Z
- Phase: `final-local-review-before-public-sync`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `ask_user` / risk `low` / confidence `0.880`
- Agreement: `false`
- Latency: `1596 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T16:36:13.136Z
- Phase: `web-directory-foundation`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `32 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T16:36:38.095Z
- Phase: `web-directory-foundation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.800`
- Agreement: `true`
- Latency: `1474 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the configured threshold.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T16:38:08.252Z
- Phase: `web-directory-foundation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.780`
- Agreement: `true`
- Latency: `768 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the configured threshold.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T16:38:54.288Z
- Phase: `web-directory-foundation`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.970`
- Agreement: `true`
- Latency: `1036 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T17:12:23.432Z
- Phase: `web-information-architecture-and-visual-system`
- Jev provider: `deterministic-fallback`
- Baseline: `passed` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `47 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T17:12:42.013Z
- Phase: `web-information-architecture-and-visual-system`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.970`
- Agreement: `true`
- Latency: `1630 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T17:17:55.056Z
- Phase: `web-product-narrative-and-capability-pages`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `1094 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T17:25:34.199Z
- Phase: `web-cross-surface-validation-and-public-quality`
- Jev provider: `deterministic-fallback`
- Baseline: `passed` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `188 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T17:25:54.060Z
- Phase: `web-cross-surface-validation-and-public-quality`
- Jev provider: `deterministic-fallback`
- Baseline: `passed` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `95 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-22T17:27:28.595Z
- Phase: `web-cross-surface-validation-and-public-quality`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `ask_user` / risk `low` / confidence `0.610`
- Agreement: `false`
- Latency: `979 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-23T10:44:29.040Z
- Phase: `website-navigation-language-and-shared-ui-polish`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `11 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-23T10:44:58.440Z
- Phase: `website-navigation-language-and-shared-ui-polish`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `ask_user` / risk `low` / confidence `0.880`
- Agreement: `false`
- Latency: `1291 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-23T12:05:29.469Z
- Phase: `website-homepage-hero-reconstruction`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `86 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-23T12:06:48.749Z
- Phase: `website-homepage-hero-reconstruction`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `11 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-23T12:07:53.523Z
- Phase: `website-homepage-hero-reconstruction`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `ask_user` / risk `medium` / confidence `0.320`
- Agreement: `false`
- Latency: `1890 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-23T13:06:16.275Z
- Phase: `website-nextjs-architecture-migration-and-cleanup`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `ask_user` / risk `low` / confidence `0.430`
- Agreement: `false`
- Latency: `2422 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-23T14:45:18.038Z
- Phase: `homepage-asset-discovery-implementation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `ask_user` / risk `low` / confidence `0.560`
- Agreement: `false`
- Latency: `2191 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-23T17:47:09.769Z
- Phase: `homepage-asset-universe-redesign`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `20 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-24T03:46:48.714Z
- Phase: `homepage-below-hero-product-narrative`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `15 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-24T06:29:03.530Z
- Phase: `homepage-audience-module`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `11 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-24T10:13:42.947Z
- Phase: `homepage-work-surfaces-recomposition`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `12 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-24T10:47:42.573Z
- Phase: `homepage-audience-module-concept-redesign`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `11 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T07:00:40.192Z
- Phase: `jev-workflow-activation`
- Jev provider: `native-jev`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: `needs_rework` / `repair` / risk `medium` / confidence `0.860`
- Agreement: `true`
- Latency: `694 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T07:01:59.505Z
- Phase: `jev-workflow-activation`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.980`
- Agreement: `true`
- Latency: `765 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T07:10:53.792Z
- Phase: `agent-natural-language-repair`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `1361 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T07:28:24.175Z
- Phase: `web-consistency-repair`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `1.000`
- Agreement: `true`
- Latency: `889 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### 2026-09-29 natural-language and web consistency follow-up
- A full Chinese request can now reach the read-only research workflow and identify NVIDIA without the Agent having to reduce the sentence to a ticker first. The result returned two issuer representations and made no transaction-related side effects.
- Demo market state stays “unknown” where the source does not establish a recognized state. Documentation search now finds execution-boundary content by its safety slug/section names, and the market-state label follows the selected site language.
- Jev reviewed the Agent and web repair stages and advanced both after their checks passed. Jev is used to reduce routine pauses during already approved work; it does not remove the user's authority over new scope, design choices or high-impact actions.
- The natural-language result also respects an explicit “不要交易 / do not trade” instruction: it presents evidence review and data-gap checks as next steps and omits quote suggestions. A live read-only MCP regression passed with two NVDA representations and no side effects.

### Jev phase-gate record — 2026-09-29T07:30:52.548Z
- Phase: `web-consistency-repair`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `708 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T07:35:55.005Z
- Phase: `product-core-review`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `1251 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T07:36:52.410Z
- Phase: `product-core-review`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `720 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T08:05:49.823Z
- Phase: `agent-mcp-live-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.980`
- Agreement: `true`
- Latency: `821 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Read-only Agent research acceptance — 2026-09-29
- In the connected Codex session, Chinese and English natural-language NVIDIA research requests returned both BNB Chain issuer representations and honored “不要交易 / do not trade”: no quote follow-up and no side effects. Requests containing two tickers asked for clarification; an unsupported ticker returned no invented result.
- The evidence is useful but not yet a polished end-user answer: valid results carry an explicit warning because market status, liquidity, and issuer/underlying logo metadata are incomplete. Earlier MCP calls took about 5–8 seconds, while the two post-reconnect checks took 20.5 and 23.1 seconds, so latency varies materially. The initial response also offered wallet-exposure reading despite “不要交易”; the follow-up now suppresses both quote and wallet-exposure suggestions for explicit research-only requests, while keeping the regular flow unchanged.
- This verifies query handling through the live MCP tool, not automatic tool selection by every third-party Agent. Keep third-party-agent onboarding and funded transaction/post-trade verification as separate acceptance items.

### Research-only follow-up refinement — 2026-09-29
- Explicit no-trade research no longer diverts users toward quote requests or wallet-exposure inspection. Tests verify those follow-ups are omitted while the regular research workflow keeps its wallet option.
- JEV advanced `core-readiness-review` to `research-brief-quality-review` at confidence `0.99` after typecheck, presentation, Demo MCP, live MCP and offline safety checks passed.
- The long-lived MCP handler did not hot-reload, but the post-reconnect check in the current Codex session passed: explicit no-trade/no-wallet research omits quote and wallet follow-ups, while the standard research path retains them.

### Jev phase-gate record — 2026-09-29T08:11:32.190Z
- Phase: `core-readiness-review`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `1051 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T08:39:31.017Z
- Phase: `research-brief-quality-review`
- Jev provider: `deterministic-fallback`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `19 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T08:39:59.913Z
- Phase: `research-brief-quality-review`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.970`
- Agreement: `true`
- Latency: `1286 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T08:44:15.720Z
- Phase: `mcp-latency-reliability`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.970`
- Agreement: `true`
- Latency: `917 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T09:13:13.772Z
- Phase: `asset-coverage-and-provenance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `medium` / confidence `0.390`
- Agreement: `true`
- Latency: `3672 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T09:39:37.854Z
- Phase: `asset-coverage-and-provenance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `medium` / confidence `0.580`
- Agreement: `true`
- Latency: `3177 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T10:08:05.373Z
- Phase: `asset-coverage-and-provenance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `medium` / confidence `0.880`
- Agreement: `true`
- Latency: `975 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T10:39:15.429Z
- Phase: `asset-coverage-and-provenance`
- Jev provider: `deterministic-fallback`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `14 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T10:39:48.918Z
- Phase: `asset-coverage-and-provenance`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `750 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T10:54:47.864Z
- Phase: `sdk-independent-validation`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `1114 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T11:03:43.328Z
- Phase: `mcp-agent-interop-validation`
- Jev provider: `native-jev`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: `blocked` / `stop` / risk `medium` / confidence `0.890`
- Agreement: `true`
- Latency: `808 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T11:30:38.614Z
- Phase: `mcp-agent-interop-validation`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.990`
- Agreement: `true`
- Latency: `758 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T11:33:52.467Z
- Phase: `execution-safety-readiness`
- Jev provider: `deterministic-fallback`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `13 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T11:36:09.875Z
- Phase: `execution-safety-readiness`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.890`
- Agreement: `true`
- Latency: `939 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T11:46:13.895Z
- Phase: `execution-safety-readiness`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.610`
- Agreement: `true`
- Latency: `1098 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the configured threshold.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T12:43:57.582Z
- Phase: `execution-safety-readiness`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.300`
- Agreement: `true`
- Latency: `1678 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the configured threshold.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T18:08:35.377Z
- Phase: `execution-safety-readiness`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `13 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - plan-stages-and-replay (test:plan-registry, test:execution-dry-run): Prepared plans are stage-bound, unchanged, time-limited, and cannot be replayed for a second broadcast attempt. Evidence: Plan-registry tests cover legal stage transitions and replay reservation; the offline rehearsal rejects changed and expired plans and replay, using a mock transport.
  - simulation-fail-closed (test:domain, test:execution-dry-run): Execution requires an explicit successful simulation result; missing, unknown, or failed simulation status must not be treated as success. Evidence: Domain regressions cover missing, unknown, and negative simulation statuses; the offline rehearsal rejects a failed simulation before broadcast.
  - allowance-boundary (test:guarded-sdk-executor, test:execution-dry-run): Quote-declared spender and allowance evidence are bound to the plan, and allowance is re-read immediately before the guarded broadcast callback. Evidence: The guarded SDK fixture rejects a revoked allowance and asserts the broadcaster is not called; its positive path checks allowance immediately before one mocked callback.
  - signed-transaction-identity (test:signed-transaction, test:guarded-sdk-executor): Before the guarded broadcast callback, the externally signed transaction must match the confirmed plan and expected signer, chain, target, value, and calldata. Evidence: Signed-transaction and guarded-SDK tests reject wrong signers and altered plan identity before the mock broadcaster; no production wallet is used.
  - gas-and-balances (test:input-balance, test:gas-safety, test:guarded-sdk-executor): The confirmed gas budget bounds signed transaction fees, and current native BNB and input-token balances must cover the planned action before broadcast. Evidence: Deterministic tests cover insufficient or changed input balance, insufficient BNB, and signed fees over the reviewed budget; rejection occurs before the mock callback.
  - sdk-plan-provenance (test:guarded-sdk-executor, test:core-hardening, test:plan-registry): The guarded SDK accepts only the unchanged plan object produced by SDK preparation and rejects forged, modified, proxied, accessor-bearing, or serialization-hook data before inspection or storage. Evidence: Regressions reject cloned and modified plans, Proxy objects, accessors, and toJSON hooks while asserting hooks or Proxy traps are not invoked.
  - offline-rehearsal-boundary (test:execution-dry-run): The end-to-end synthetic rehearsal covers expected rejection paths and demonstrates zero network broadcast requests and no real wallet use. Evidence: The fixture traverses prepare, simulate, confirm, test-only signing, and pre-broadcast checks; it rejects nine negative cases and reports broadcastRequests 0 and realWalletUsed false.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T18:09:47.283Z
- Phase: `execution-safety-readiness`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.570`
- Agreement: `true`
- Latency: `1669 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the configured threshold; the least-certain review item is criterion_signed-transaction-identity (0.570). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - plan-stages-and-replay (test:plan-registry, test:execution-dry-run): Prepared plans are stage-bound, unchanged, time-limited, and cannot be replayed for a second broadcast attempt. Evidence: Plan-registry tests cover legal stage transitions and replay reservation; the offline rehearsal rejects changed and expired plans and replay, using a mock transport.
  - simulation-fail-closed (test:domain, test:execution-dry-run): Execution requires an explicit successful simulation result; missing, unknown, or failed simulation status must not be treated as success. Evidence: Domain regressions cover missing, unknown, and negative simulation statuses; the offline rehearsal rejects a failed simulation before broadcast.
  - allowance-boundary (test:guarded-sdk-executor, test:execution-dry-run): Quote-declared spender and allowance evidence are bound to the plan, and allowance is re-read immediately before the guarded broadcast callback. Evidence: The guarded SDK fixture rejects a revoked allowance and asserts the broadcaster is not called; its positive path checks allowance immediately before one mocked callback.
  - signed-transaction-identity (test:signed-transaction, test:guarded-sdk-executor): Before the guarded broadcast callback, the externally signed transaction must match the confirmed plan and expected signer, chain, target, value, and calldata. Evidence: Signed-transaction and guarded-SDK tests reject wrong signers and altered plan identity before the mock broadcaster; no production wallet is used.
  - gas-and-balances (test:input-balance, test:gas-safety, test:guarded-sdk-executor): The confirmed gas budget bounds signed transaction fees, and current native BNB and input-token balances must cover the planned action before broadcast. Evidence: Deterministic tests cover insufficient or changed input balance, insufficient BNB, and signed fees over the reviewed budget; rejection occurs before the mock callback.
  - sdk-plan-provenance (test:guarded-sdk-executor, test:core-hardening, test:plan-registry): The guarded SDK accepts only the unchanged plan object produced by SDK preparation and rejects forged, modified, proxied, accessor-bearing, or serialization-hook data before inspection or storage. Evidence: Regressions reject cloned and modified plans, Proxy objects, accessors, and toJSON hooks while asserting hooks or Proxy traps are not invoked.
  - offline-rehearsal-boundary (test:execution-dry-run): The end-to-end synthetic rehearsal covers expected rejection paths and demonstrates zero network broadcast requests and no real wallet use. Evidence: The fixture traverses prepare, simulate, confirm, test-only signing, and pre-broadcast checks; it rejects nine negative cases and reports broadcastRequests 0 and realWalletUsed false.
- Jev confidence by review item: status=0.970, nextAction=0.980, riskLevel=1.000, criterion_plan-stages-and-replay=0.970, criterion_simulation-fail-closed=0.990, criterion_allowance-boundary=0.890, criterion_signed-transaction-identity=0.570, criterion_gas-and-balances=0.990, criterion_sdk-plan-provenance=0.980, criterion_offline-rehearsal-boundary=1.000, deferredScope=1.000
- Jev criterion findings: Criterion plan-stages-and-replay: met (0.970 confidence) — Prepared plans are stage-bound, unchanged, time-limited, and cannot be replayed for a second broadcast attempt.; Criterion simulation-fail-closed: met (0.990 confidence) — Execution requires an explicit successful simulation result; missing, unknown, or failed simulation status must not be treated as success.; Criterion allowance-boundary: met (0.890 confidence) — Quote-declared spender and allowance evidence are bound to the plan, and allowance is re-read immediately before the guarded broadcast callback.; Criterion signed-transaction-identity: met (0.570 confidence) — Before the guarded broadcast callback, the externally signed transaction must match the confirmed plan and expected signer, chain, target, value, and calldata.; Criterion gas-and-balances: met (0.990 confidence) — The confirmed gas budget bounds signed transaction fees, and current native BNB and input-token balances must cover the planned action before broadcast.; Criterion sdk-plan-provenance: met (0.980 confidence) — The guarded SDK accepts only the unchanged plan object produced by SDK preparation and rejects forged, modified, proxied, accessor-bearing, or serialization-hook data before inspection or storage.; Criterion offline-rehearsal-boundary: met (1.000 confidence) — The end-to-end synthetic rehearsal covers expected rejection paths and demonstrates zero network broadcast requests and no real wallet use.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T18:19:04.421Z
- Phase: `execution-safety-readiness`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.900`
- Agreement: `true`
- Latency: `1207 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - plan-stages-and-replay (test:plan-registry, test:execution-dry-run): Prepared plans are stage-bound, unchanged, time-limited, and cannot be replayed for a second broadcast attempt. Evidence: Plan-registry tests cover legal stage transitions and one-time replay reservation; the offline rehearsal rejects changed and expired plans and replay using a mock transport.
  - simulation-fail-closed (test:domain, test:execution-dry-run): Execution requires an explicit successful simulation result; missing, unknown, or failed simulation status must not be treated as success. Evidence: Domain assertions cover missing, unknown, and negative simulation statuses; the offline rehearsal rejects failed simulation before reaching signing or broadcast.
  - allowance-boundary (test:guarded-sdk-executor, test:execution-dry-run): Quote-declared spender and allowance evidence are plan-bound, and allowance is re-read immediately before the guarded broadcast callback. Evidence: The guarded SDK test re-reads allowance before the callback, rejects revoked allowance, and asserts the callback count remains zero on rejection. The success path calls only a mock broadcaster.
  - signed-payload-matching (test:signed-transaction, test:guarded-sdk-executor): The parsed signed transaction must match the confirmed plan chain ID, target, native value, and calldata before execution. Evidence: The matcher tests accept valid legacy and EIP-1559 fixtures and reject individually altered chain ID, target, value, and calldata. Guarded SDK tests verify each mismatch is rejected before the broadcaster callback.
  - signer-signature-integrity (test:signed-transaction, test:guarded-sdk-executor): The signed transaction signature must recover to the expected plan wallet; malformed, unsigned, wrong-wallet, or unconfirmed requests must be rejected. Evidence: Offline assertions reject a wrong recovered signer, malformed encoding, unsigned payload, wrong expected address, and unconfirmed plan. The guarded SDK rejects a wrong signer before its mock callback; fixtures use public test-only keys.
  - gas-and-balances (test:input-balance, test:gas-safety, test:guarded-sdk-executor): The confirmed gas budget bounds signed fees, and current native BNB and input-token balances cover the plan before the broadcast callback. Evidence: Tests reject insufficient or changed input balance, insufficient BNB, and fees over the reviewed budget before the mock callback.
  - sdk-plan-provenance (test:guarded-sdk-executor, test:core-hardening, test:plan-registry): The guarded SDK accepts only the unchanged plan object issued by SDK preparation and rejects forged, modified, proxied, accessor-bearing, or serialization-hook data before inspection or storage. Evidence: Regressions reject cloned and modified plans, Proxy objects, accessors, and toJSON hooks; assertions verify getters and Proxy traps are not invoked.
  - offline-rehearsal-boundary (test:execution-dry-run): The end-to-end synthetic rehearsal covers expected rejection paths and demonstrates zero network broadcasts and no real wallet use. Evidence: The fixture traverses prepare, simulate, confirm, test-only signing, and pre-broadcast checks; it rejects nine negative cases and reports broadcastRequests 0 and realWalletUsed false.
- Jev confidence by review item: status=0.980, nextAction=0.980, riskLevel=0.990, criterion_plan-stages-and-replay=0.980, criterion_simulation-fail-closed=0.980, criterion_allowance-boundary=0.900, criterion_signed-payload-matching=1.000, criterion_signer-signature-integrity=1.000, criterion_gas-and-balances=0.980, criterion_sdk-plan-provenance=0.980, criterion_offline-rehearsal-boundary=1.000, deferredScope=0.990
- Jev criterion findings: Criterion plan-stages-and-replay: met (0.980 confidence) — Prepared plans are stage-bound, unchanged, time-limited, and cannot be replayed for a second broadcast attempt.; Criterion simulation-fail-closed: met (0.980 confidence) — Execution requires an explicit successful simulation result; missing, unknown, or failed simulation status must not be treated as success.; Criterion allowance-boundary: met (0.900 confidence) — Quote-declared spender and allowance evidence are plan-bound, and allowance is re-read immediately before the guarded broadcast callback.; Criterion signed-payload-matching: met (1.000 confidence) — The parsed signed transaction must match the confirmed plan chain ID, target, native value, and calldata before execution.; Criterion signer-signature-integrity: met (1.000 confidence) — The signed transaction signature must recover to the expected plan wallet; malformed, unsigned, wrong-wallet, or unconfirmed requests must be rejected.; Criterion gas-and-balances: met (0.980 confidence) — The confirmed gas budget bounds signed fees, and current native BNB and input-token balances cover the plan before the broadcast callback.; Criterion sdk-plan-provenance: met (0.980 confidence) — The guarded SDK accepts only the unchanged plan object issued by SDK preparation and rejects forged, modified, proxied, accessor-bearing, or serialization-hook data before inspection or storage.; Criterion offline-rehearsal-boundary: met (1.000 confidence) — The end-to-end synthetic rehearsal covers expected rejection paths and demonstrates zero network broadcasts and no real wallet use.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T18:22:37.314Z
- Phase: `local-delivery-readiness`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.670`
- Agreement: `true`
- Latency: `937 ms`
- Phase transition: `pause`
- Transition reason: Criterion phase-six-safety-regression lacks a sufficiently confident Jev review (0.670); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - local-package-consumer (typecheck, build, pack:check, test:cleanroom): The standalone SDK builds and packs locally, and a clean consumer can import its runtime exports and TypeScript declarations using the documented Node runtime. Evidence: The clean-room test installs a locally packed tarball into a temporary project and checks root ESM imports, declarations, package exports and Node engine metadata; no registry publication occurs.
  - mcp-onboarding-config (test:distribution, test:onboarding, test:sdk-example, test:mcp-config): Demo and Live MCP configuration examples, onboarding steps, SDK example and package metadata agree with the current repository commands and safety boundaries. Evidence: Automated checks assert Demo/Live launch args, package metadata, onboarding prompts, no-key Demo path and SDK example API usage; the corresponding docs were cross-checked against package scripts.
  - execution-capability-claims (test:guarded-sdk-executor, test:core-hardening, test:plan-registry): SDK and capability documentation distinguish the guarded standard BSC EVM path from integrator-owned low-level APIs and accurately list unsupported or deferred execution scope. Evidence: Reviewed docs/SDK_USAGE.md, README.md and the capability matrix against the guarded SDK implementation and tests; they state the one-action/ERC-20/spender boundary, process-local plan limits, low-level escape hatches, and RFQ/multi-action/native-input deferrals.
  - phase-six-safety-regression (test:domain, test:plan-registry, test:signed-transaction, test:input-balance, test:gas-safety, test:execution-dry-run, test:guarded-sdk-executor, test:core-hardening): The final local regression preserves fail-closed simulation, plan lifecycle and replay checks, signed transaction identity, current balances, allowance, gas bounds, and zero-network-broadcast rehearsal. Evidence: All selected tests use deterministic fixtures; the offline rehearsal reports nine rejected negative cases, zero broadcast requests and no real wallet, while guarded SDK checks use only a mock broadcaster.
  - phase-gate-integrity (test:jev-shadow, typecheck): Jev phase advancement requires unique explicit criteria, complete criterion verdicts, confidence at or above the hard 0.85 floor, and accepted deferred scope; Jev never executes actions itself. Evidence: Gate regression tests cover missing/duplicate criteria, incomplete verdicts, rejected low threshold configuration, selected-answer confidence validation, deferred review and no-action behavior; the successful Phase 6 gate record is retained.
  - documentation-and-research-limits (test:distribution, test:onboarding, test:core-hardening): Product, technical, development, and capability reports preserve the observed asset coverage/data-quality limitations and execution deferrals rather than claiming completeness or funded settlement. Evidence: Cross-checked the phase plan, README, Quickstart, SDK guide, capability map and interim reports; catalog count and freshness gaps, unknown status/liquidity, process-local replay, and unverified funded settlement remain explicit.
- Jev confidence by review item: status=0.970, nextAction=0.980, riskLevel=1.000, criterion_local-package-consumer=0.990, criterion_mcp-onboarding-config=0.990, criterion_execution-capability-claims=0.980, criterion_phase-six-safety-regression=0.670, criterion_phase-gate-integrity=0.940, criterion_documentation-and-research-limits=0.960
- Jev criterion findings: Criterion local-package-consumer: met (0.990 confidence) — The standalone SDK builds and packs locally, and a clean consumer can import its runtime exports and TypeScript declarations using the documented Node runtime.; Criterion mcp-onboarding-config: met (0.990 confidence) — Demo and Live MCP configuration examples, onboarding steps, SDK example and package metadata agree with the current repository commands and safety boundaries.; Criterion execution-capability-claims: met (0.980 confidence) — SDK and capability documentation distinguish the guarded standard BSC EVM path from integrator-owned low-level APIs and accurately list unsupported or deferred execution scope.; Criterion phase-six-safety-regression: met (0.670 confidence) — The final local regression preserves fail-closed simulation, plan lifecycle and replay checks, signed transaction identity, current balances, allowance, gas bounds, and zero-network-broadcast rehearsal.; Criterion phase-gate-integrity: met (0.940 confidence) — Jev phase advancement requires unique explicit criteria, complete criterion verdicts, confidence at or above the hard 0.85 floor, and accepted deferred scope; Jev never executes actions itself.; Criterion documentation-and-research-limits: met (0.960 confidence) — Product, technical, development, and capability reports preserve the observed asset coverage/data-quality limitations and execution deferrals rather than claiming completeness or funded settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T18:23:50.092Z
- Phase: `local-delivery-readiness`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.710`
- Agreement: `true`
- Latency: `1124 ms`
- Phase transition: `pause`
- Transition reason: Criterion plan-lifecycle-replay lacks a sufficiently confident Jev review (0.710); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - local-package-consumer (typecheck, build, pack:check, test:cleanroom): The standalone SDK builds and packs locally, and a clean consumer can import its runtime exports and TypeScript declarations using the documented Node runtime. Evidence: The clean-room test installs a locally packed tarball into a temporary project and checks root ESM imports, declarations, package exports and Node engine metadata; no registry publication occurs.
  - mcp-onboarding-config (test:distribution, test:onboarding, test:sdk-example, test:mcp-config): Demo and Live MCP configuration examples, onboarding steps, SDK example and package metadata agree with current repository commands and safety boundaries. Evidence: Automated checks assert Demo/Live launch args, package metadata, onboarding prompts, no-key Demo path and SDK example API usage; corresponding docs were cross-checked against package scripts.
  - execution-capability-claims (test:guarded-sdk-executor, test:core-hardening, test:plan-registry): SDK and capability documentation distinguish the guarded standard BSC EVM path from integrator-owned low-level APIs and accurately list unsupported or deferred execution scope. Evidence: Reviewed SDK_USAGE, README and capability matrix against implementation/tests; they state the one-action/ERC-20/spender boundary, process-local plan limits, low-level escape hatches, and RFQ/multi-action/native-input deferrals.
  - simulation-fail-closed (test:domain, test:execution-dry-run): Missing, unknown, or failed simulation status never becomes a successful simulation or a confirmable plan. Evidence: Domain assertions exercise missing, unknown, and negative provider simulation statuses; the offline flow asserts a failed simulation produces a failed plan before later stages.
  - plan-lifecycle-replay (test:plan-registry, test:execution-dry-run): PlanRegistry enforces only legal awaiting-confirmation to simulated to confirmed transitions, rejects expired or changed plans, and allows at most one broadcast reservation. Evidence: PlanRegistry test reports stagedTransitions true, replayRejected true, and seven mutation cases rejected; the end-to-end rehearsal independently rejects changed plan, expiry, and replay.
  - signed-transaction-integrity (test:signed-transaction, test:guarded-sdk-executor): A signed EVM payload is decoded and matched to the confirmed plan chain ID, target, value and calldata, and its recovered signer must match the intended wallet. Evidence: The matcher accepts legacy/EIP-1559 fixtures and rejects chainId, target, value, calldata, recovered signer, malformed encoding, unsigned payload, wrong expected address, and unconfirmed plan. Guarded SDK tests each field mismatch before its callback.
  - gas-balance-allowance (test:input-balance, test:gas-safety, test:guarded-sdk-executor): The reviewed gas budget and latest BNB/input-token balances and ERC-20 allowance are checked before the guarded broadcast callback. Evidence: Tests reject insufficient or changed input balance, insufficient BNB, over-budget signed fees, and revoked allowance; guarded SDK assertions confirm rejected cases do not call the broadcaster.
  - zero-broadcast-boundary (test:execution-dry-run, test:guarded-sdk-executor): The synthetic end-to-end rehearsal uses no real wallet and makes zero network broadcast requests; SDK guarded execution uses only a mock broadcaster after checks. Evidence: Offline outputs explicitly report realWalletUsed false and broadcastRequests 0; guarded SDK reports networkBroadcasts 0 and one mocked success callback, with negative cases rejected before callback.
  - phase-gate-integrity (test:jev-shadow, typecheck): Jev phase advancement requires unique explicit criteria, complete criterion verdicts, confidence at or above the hard 0.85 floor, and accepted deferred scope; Jev does not execute actions. Evidence: Gate tests cover missing/duplicate criteria, incomplete verdicts, threshold floor, selected-answer confidence validation, deferred review and no-action behavior; Phase 6 also passed a real Native Jev review at 0.900.
  - documentation-and-research-limits (test:distribution, test:onboarding, test:core-hardening): Product, technical, development, and capability reports preserve observed asset coverage/data-quality limitations and execution deferrals rather than claiming completeness or funded settlement. Evidence: Cross-checked phase plan, README, Quickstart, SDK guide, capability map and interim reports; catalog count/freshness gaps, unknown status/liquidity, process-local replay, and unverified funded settlement remain explicit.
- Jev confidence by review item: status=0.960, nextAction=0.970, riskLevel=1.000, criterion_local-package-consumer=0.990, criterion_mcp-onboarding-config=0.990, criterion_execution-capability-claims=0.960, criterion_simulation-fail-closed=0.970, criterion_plan-lifecycle-replay=0.710, criterion_signed-transaction-integrity=1.000, criterion_gas-balance-allowance=1.000, criterion_zero-broadcast-boundary=1.000, criterion_phase-gate-integrity=0.980, criterion_documentation-and-research-limits=0.970
- Jev criterion findings: Criterion local-package-consumer: met (0.990 confidence) — The standalone SDK builds and packs locally, and a clean consumer can import its runtime exports and TypeScript declarations using the documented Node runtime.; Criterion mcp-onboarding-config: met (0.990 confidence) — Demo and Live MCP configuration examples, onboarding steps, SDK example and package metadata agree with current repository commands and safety boundaries.; Criterion execution-capability-claims: met (0.960 confidence) — SDK and capability documentation distinguish the guarded standard BSC EVM path from integrator-owned low-level APIs and accurately list unsupported or deferred execution scope.; Criterion simulation-fail-closed: met (0.970 confidence) — Missing, unknown, or failed simulation status never becomes a successful simulation or a confirmable plan.; Criterion plan-lifecycle-replay: met (0.710 confidence) — PlanRegistry enforces only legal awaiting-confirmation to simulated to confirmed transitions, rejects expired or changed plans, and allows at most one broadcast reservation.; Criterion signed-transaction-integrity: met (1.000 confidence) — A signed EVM payload is decoded and matched to the confirmed plan chain ID, target, value and calldata, and its recovered signer must match the intended wallet.; Criterion gas-balance-allowance: met (1.000 confidence) — The reviewed gas budget and latest BNB/input-token balances and ERC-20 allowance are checked before the guarded broadcast callback.; Criterion zero-broadcast-boundary: met (1.000 confidence) — The synthetic end-to-end rehearsal uses no real wallet and makes zero network broadcast requests; SDK guarded execution uses only a mock broadcaster after checks.; Criterion phase-gate-integrity: met (0.980 confidence) — Jev phase advancement requires unique explicit criteria, complete criterion verdicts, confidence at or above the hard 0.85 floor, and accepted deferred scope; Jev does not execute actions.; Criterion documentation-and-research-limits: met (0.970 confidence) — Product, technical, development, and capability reports preserve observed asset coverage/data-quality limitations and execution deferrals rather than claiming completeness or funded settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T18:27:04.784Z
- Phase: `local-delivery-readiness`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.870`
- Agreement: `true`
- Latency: `926 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - local-package-consumer (pack:check, test:distribution, test:cleanroom): The standalone SDK builds, packs locally, and a clean consumer can install and import its runtime exports and TypeScript declarations using the documented Node runtime. Evidence: Checks validate package metadata and files, a dry-run tarball, and isolated local installation/import/type use. No package is published.
  - mcp-onboarding-config (test:distribution, test:onboarding, test:sdk-example, test:mcp-config): Demo and Live MCP setup, onboarding, SDK example, and package guidance match executable repository commands and safety boundaries. Evidence: Automated checks assert launch arguments, package metadata, onboarding prompts, no-key Demo path, and SDK API usage; docs are cross-checked against available scripts.
  - execution-capability-claims (test:guarded-sdk-executor, test:core-hardening, test:plan-registry): SDK and capability documentation distinguish guarded standard BSC EVM execution from integrator-owned low-level APIs and list unsupported or deferred scope accurately. Evidence: Implementation and regressions cover the one-action/ERC-20/spender boundary, process-local plan registry and low-level escape hatches; documentation explicitly defers RFQ, multi-action, native-input, durable replay, and funded settlement.
  - simulation-fail-closed (test:domain, test:execution-dry-run): Missing, unknown, or failed simulation status cannot be treated as successful or produce a confirmable plan. Evidence: Domain assertions cover missing, unknown, and negative provider simulation status; offline flow asserts failed simulation stops before confirmation and signing.
  - plan-lifecycle-replay (test:plan-registry, test:execution-dry-run): PlanRegistry allows only legal awaiting-confirmation to simulated to confirmed transitions, rejects changed and expired plans including plans that expire after registration, and permits at most one broadcast reservation. Evidence: A deterministic fake-clock regression registers a still-valid plan, advances time past expiry, proves requireExact rejects and removes it; related tests cover stage transitions, seven mutations, single-use broadcast reservation, and offline changed/expired/replay rejection.
  - signed-transaction-integrity (test:signed-transaction, test:guarded-sdk-executor): A signed EVM payload is decoded and matched to the confirmed plan chain ID, target, value, calldata, and intended wallet signer. Evidence: Fixtures accept legacy and EIP-1559 payloads and reject chain, target, value, calldata, recovered signer, malformed encoding, unsigned payload, wrong expected address, and unconfirmed-plan cases; guarded path rejects mismatches before the mock callback.
  - gas-balance-allowance (test:input-balance, test:gas-safety, test:guarded-sdk-executor): Reviewed gas budget, latest BNB/input-token balances, and ERC-20 allowance are checked before guarded broadcast callback. Evidence: Regressions reject insufficient or changed input balance, insufficient BNB, over-budget signed fees, and revoked allowance; guarded SDK confirms rejection before callback.
  - zero-broadcast-boundary (test:execution-dry-run, test:guarded-sdk-executor): The synthetic end-to-end rehearsal uses no real wallet and makes zero network broadcast requests; guarded SDK execution uses only a mock broadcaster after checks. Evidence: Offline output reports realWalletUsed false and broadcastRequests 0; guarded SDK reports networkBroadcasts 0 and one mocked success callback, with negative cases rejected before callback.
  - phase-gate-integrity (test:jev-shadow, typecheck): Jev phase advancement requires unique explicit criteria, complete criterion verdicts, confidence at or above the hard 0.85 floor, and accepted deferred scope; Jev does not execute actions. Evidence: Gate tests cover missing/duplicate criteria, incomplete verdicts, confidence floor, selected-answer confidence validation, deferred-scope review, and no-action behavior.
  - documentation-and-research-limits (test:distribution, test:onboarding, test:core-hardening): Product, technical, development, and capability reports preserve observed asset coverage/data-quality limits and execution deferrals rather than claiming completeness or funded settlement. Evidence: Cross-checks cover phase plan, README, Quickstart, SDK guide, capability map, and interim reports; catalog count/freshness gaps, unknown status/liquidity, process-local replay, and unverified funded settlement remain explicit.
- Jev confidence by review item: status=0.870, nextAction=0.920, riskLevel=1.000, criterion_local-package-consumer=0.960, criterion_mcp-onboarding-config=0.950, criterion_execution-capability-claims=0.880, criterion_simulation-fail-closed=0.990, criterion_plan-lifecycle-replay=0.990, criterion_signed-transaction-integrity=0.990, criterion_gas-balance-allowance=0.990, criterion_zero-broadcast-boundary=0.990, criterion_phase-gate-integrity=0.930, criterion_documentation-and-research-limits=0.940
- Jev criterion findings: Criterion local-package-consumer: met (0.960 confidence) — The standalone SDK builds, packs locally, and a clean consumer can install and import its runtime exports and TypeScript declarations using the documented Node runtime.; Criterion mcp-onboarding-config: met (0.950 confidence) — Demo and Live MCP setup, onboarding, SDK example, and package guidance match executable repository commands and safety boundaries.; Criterion execution-capability-claims: met (0.880 confidence) — SDK and capability documentation distinguish guarded standard BSC EVM execution from integrator-owned low-level APIs and list unsupported or deferred scope accurately.; Criterion simulation-fail-closed: met (0.990 confidence) — Missing, unknown, or failed simulation status cannot be treated as successful or produce a confirmable plan.; Criterion plan-lifecycle-replay: met (0.990 confidence) — PlanRegistry allows only legal awaiting-confirmation to simulated to confirmed transitions, rejects changed and expired plans including plans that expire after registration, and permits at most one broadcast reservation.; Criterion signed-transaction-integrity: met (0.990 confidence) — A signed EVM payload is decoded and matched to the confirmed plan chain ID, target, value, calldata, and intended wallet signer.; Criterion gas-balance-allowance: met (0.990 confidence) — Reviewed gas budget, latest BNB/input-token balances, and ERC-20 allowance are checked before guarded broadcast callback.; Criterion zero-broadcast-boundary: met (0.990 confidence) — The synthetic end-to-end rehearsal uses no real wallet and makes zero network broadcast requests; guarded SDK execution uses only a mock broadcaster after checks.; Criterion phase-gate-integrity: met (0.930 confidence) — Jev phase advancement requires unique explicit criteria, complete criterion verdicts, confidence at or above the hard 0.85 floor, and accepted deferred scope; Jev does not execute actions.; Criterion documentation-and-research-limits: met (0.940 confidence) — Product, technical, development, and capability reports preserve observed asset coverage/data-quality limits and execution deferrals rather than claiming completeness or funded settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T19:23:46.140Z
- Phase: `asset-source-coverage-reconciliation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.520`
- Agreement: `true`
- Latency: `1266 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the minimum threshold (0.85); the least-certain review item is riskLevel (0.520). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - snapshot-count-reconciliation (test:asset-directory, typecheck): Report actual returned BSC representation identities/counts separately from platform metadata, compare exact chain/platform/contract sets, and preserve the unexplained discrepancy without claiming a complete inventory. Evidence: Two live read-only snapshots 54 seconds apart each returned 488 unique BSC representations (Ondo 442, bStocks 46; 448 underlyings), while near-contemporaneous platform metadata declared BSC 458+80=538. Unfiltered and explicit BSC sets matched; Chain 1 and CT_501 queries returned zero despite metadata declarations. The discrepancy cause and missing identities remain unknown.
  - filter-and-pagination-contract (test:asset-directory): Distinguish observed filter behavior from interpretation, and distinguish local UI slicing from provider-supported pagination. Evidence: In both live samples all 13 documented tabId requests returned the exact same 488 BSC identity set as the unfiltered query. Official /tokens docs/schema list chain, platform and tabId filters but no page/limit/offset/cursor or total-count parameter; local 50-row pages are slices of the already-fetched array. Equality does not prove the filter is ignored or all assets match all tabs.
  - quote-time-provenance (test:asset-directory, test:core-hardening): Do not conflate catalog response time with an individual quote timestamp; identify the supported source of per-representation update times and the current directory gap. Evidence: Both audits found token/reference prices on 488/488 /tokens rows but tokenPriceUpdatedAt on 0/488; the dedicated /price query returned price and timestamp for both NVDA representations. Official schema documents tokenPriceUpdatedAt on /price, not in the /tokens row. Source and platform response timestamps are retained separately; no freshness SLA is asserted.
  - audit-boundaries-and-reporting (test:asset-directory, test:core-hardening, typecheck): Keep the audit read-only, retain unresolved provider behavior as explicit limitations, and never label the observed list exhaustive. Evidence: The existing coverage script issues GET queries only and reports sideEffects none, filterConsistency separately from catalogCompleteness.proven=false. Local asset-directory, core-hardening and TypeScript checks pass; no wallet, signing, trade plan or broadcast path is invoked.
- Jev confidence by review item: status=0.960, nextAction=0.790, riskLevel=0.520, criterion_snapshot-count-reconciliation=0.990, criterion_filter-and-pagination-contract=0.920, criterion_quote-time-provenance=0.990, criterion_audit-boundaries-and-reporting=0.990, deferredScope=0.950
- Jev criterion findings: Criterion snapshot-count-reconciliation: met (0.990 confidence) — Report actual returned BSC representation identities/counts separately from platform metadata, compare exact chain/platform/contract sets, and preserve the unexplained discrepancy without claiming a complete inventory.; Criterion filter-and-pagination-contract: met (0.920 confidence) — Distinguish observed filter behavior from interpretation, and distinguish local UI slicing from provider-supported pagination.; Criterion quote-time-provenance: met (0.990 confidence) — Do not conflate catalog response time with an individual quote timestamp; identify the supported source of per-representation update times and the current directory gap.; Criterion audit-boundaries-and-reporting: met (0.990 confidence) — Keep the audit read-only, retain unresolved provider behavior as explicit limitations, and never label the observed list exhaustive.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T19:31:00.094Z
- Phase: `asset-source-coverage-reconciliation`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `15 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - snapshot-count-reconciliation (test:asset-directory, typecheck): Report observed representation identities and counts separately from platform metadata, compare exact chain/platform/contract sets, and do not claim a complete inventory. Evidence: Two read-only snapshots about 54 seconds apart observed 488 unique BSC representations (Ondo 442, bStocks 46) versus 538 platform-declared token representations. Exact unfiltered and chain-filtered subsets matched; Chain 1 and CT_501 queries returned zero. The reason and missing identities remain unknown.
  - filter-and-pagination-contract (test:asset-directory): Separate observed filter-set behavior from response integrity, and distinguish local UI slices from upstream pagination. Evidence: Both live snapshots showed all 13 tabId responses equal the unfiltered 488-identity set. Official docs list chain/platform/tab filters but no pagination or total-count marker; local 50-row pages slice the fetched response. Equality does not prove filter failure or universal sector membership.
  - quote-time-provenance (test:asset-directory, test:core-hardening): Do not treat catalog response time as per-asset quote time; verify dedicated price data against exact representation identity. Evidence: The fresh probe found no per-row update time on 488 token-list rows. The dedicated price endpoint returned exact chain/platform/contract matches for both requested NVDA representations, each with a positive finite price, reference price, and timestamp. Synthetic tests reject missing, unexpected, duplicate, zero-price, and invalid-timestamp cases; no freshness SLA is asserted.
  - audit-boundaries-and-reporting (test:asset-directory, test:core-hardening, typecheck): Keep provider observations read-only, document unresolved behavior accurately, and never label the observed list exhaustive. Evidence: The inspected audit uses signed GET requests only and exposes no wallet, plan, transaction, or write path. Output reports observed response integrity separately from filter equality and leaves catalogCompleteness.proven false; local checks pass.
  - read-only-risk-boundary (test:jev-shadow): Jev risk guidance recognizes only explicitly approved, bounded read-only requests as potentially low risk while keeping private data, paid actions, writes, wallet signing, broadcast, and deployment outside that allowance. Evidence: The Jev shadow regression asserts the risk rubric includes approved read-only requests and configured credentials while retaining explicit paid-operation and external-write boundaries; the hard 0.85 confidence floor is unchanged.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T19:31:36.049Z
- Phase: `asset-source-coverage-reconciliation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.610`
- Agreement: `true`
- Latency: `1440 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the minimum threshold (0.85); the least-certain review item is nextAction (0.610). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - snapshot-count-reconciliation (test:asset-directory, typecheck): Report observed representation identities and counts separately from platform metadata, compare exact chain/platform/contract sets, and do not claim a complete inventory. Evidence: Two read-only snapshots about 54 seconds apart observed 488 unique BSC representations (Ondo 442, bStocks 46) versus 538 platform-declared token representations. Exact unfiltered and chain-filtered subsets matched; Chain 1 and CT_501 queries returned zero. The reason and missing identities remain unknown.
  - filter-and-pagination-contract (test:asset-directory): Separate observed filter-set behavior from response integrity, and distinguish local UI slices from upstream pagination. Evidence: Both live snapshots showed all 13 tabId responses equal the unfiltered 488-identity set. Official docs list chain/platform/tab filters but no pagination or total-count marker; local 50-row pages slice the fetched response. Equality does not prove filter failure or universal sector membership.
  - quote-time-provenance (test:asset-directory, test:core-hardening): Do not treat catalog response time as per-asset quote time; verify dedicated price data against exact representation identity. Evidence: The fresh probe found no per-row update time on 488 token-list rows. The dedicated price endpoint returned exact chain/platform/contract matches for both requested NVDA representations, each with a positive finite price, reference price, and timestamp. Synthetic tests reject missing, unexpected, duplicate, zero-price, and invalid-timestamp cases; no freshness SLA is asserted.
  - audit-boundaries-and-reporting (test:asset-directory, test:core-hardening, typecheck): Keep provider observations read-only, document unresolved behavior accurately, and never label the observed list exhaustive. Evidence: The inspected audit uses signed GET requests only and exposes no wallet, plan, transaction, or write path. Output reports observed response integrity separately from filter equality and leaves catalogCompleteness.proven false; local checks pass.
  - read-only-risk-boundary (test:jev-shadow): Jev risk guidance recognizes only explicitly approved, bounded read-only requests as potentially low risk while keeping private data, paid actions, writes, wallet signing, broadcast, and deployment outside that allowance. Evidence: The Jev shadow regression asserts the risk rubric includes approved read-only requests and configured credentials while retaining explicit paid-operation and external-write boundaries; the hard 0.85 confidence floor is unchanged.
- Jev confidence by review item: status=0.960, nextAction=0.610, riskLevel=0.990, criterion_snapshot-count-reconciliation=0.970, criterion_filter-and-pagination-contract=0.890, criterion_quote-time-provenance=1.000, criterion_audit-boundaries-and-reporting=0.990, criterion_read-only-risk-boundary=0.980, deferredScope=0.980
- Jev criterion findings: Criterion snapshot-count-reconciliation: met (0.970 confidence) — Report observed representation identities and counts separately from platform metadata, compare exact chain/platform/contract sets, and do not claim a complete inventory.; Criterion filter-and-pagination-contract: met (0.890 confidence) — Separate observed filter-set behavior from response integrity, and distinguish local UI slices from upstream pagination.; Criterion quote-time-provenance: met (1.000 confidence) — Do not treat catalog response time as per-asset quote time; verify dedicated price data against exact representation identity.; Criterion audit-boundaries-and-reporting: met (0.990 confidence) — Keep provider observations read-only, document unresolved behavior accurately, and never label the observed list exhaustive.; Criterion read-only-risk-boundary: met (0.980 confidence) — Jev risk guidance recognizes only explicitly approved, bounded read-only requests as potentially low risk while keeping private data, paid actions, writes, wallet signing, broadcast, and deployment outside that allowance.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T19:36:47.497Z
- Phase: `asset-source-coverage-reconciliation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.790`
- Agreement: `true`
- Latency: `1496 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the minimum threshold (0.85); the least-certain review item is nextAction (0.790). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - snapshot-count-reconciliation (test:asset-directory, typecheck): Report observed representation identities and counts separately from platform metadata, compare exact chain/platform/contract sets, and do not claim a complete inventory. Evidence: Two read-only snapshots about 54 seconds apart observed 488 unique BSC representations (Ondo 442, bStocks 46) versus 538 platform-declared token representations. Exact unfiltered and chain-filtered subsets matched; Chain 1 and CT_501 queries returned zero. The reason and missing identities remain unknown.
  - filter-and-pagination-contract (test:asset-directory): Separate observed filter-set behavior from response integrity, and distinguish local UI slices from upstream pagination. Evidence: Both live snapshots showed all 13 tabId responses equal the unfiltered 488-identity set. Official docs list chain/platform/tab filters but no pagination or total-count marker; local 50-row pages slice the fetched response. Equality does not prove filter failure or universal sector membership.
  - quote-time-provenance (test:asset-directory, test:core-hardening): Do not treat catalog response time as per-asset quote time; verify dedicated price data against exact representation identity. Evidence: Two final probes found no per-row update time on 488 token-list rows. The dedicated price endpoint returned exact matches for both NVDA representations, each with one positive finite price, reference price, and timestamp. Synthetic tests reject missing, unexpected, duplicate, zero-price, and invalid-timestamp cases; no freshness SLA is asserted.
  - audit-boundaries-and-reporting (test:asset-directory, test:core-hardening, typecheck): Keep provider observations read-only, document unresolved behavior accurately, and never label the observed list exhaustive. Evidence: The inspected audit uses signed GET requests only and has no wallet, plan, transaction, or write path. Output separates response integrity from filter equality and leaves catalogCompleteness.proven false; local checks pass.
  - read-only-risk-boundary (test:jev-shadow): Jev risk guidance recognizes explicitly approved, bounded read-only requests as potentially low risk while keeping private data, paid actions, writes, wallet signing, broadcast, and deployment outside that allowance. Evidence: The Jev shadow regression asserts the approved read-only boundary and configured-credential condition while retaining paid-operation and external-write boundaries; the hard 0.85 confidence floor is unchanged.
- Jev confidence by review item: status=0.980, nextAction=0.790, riskLevel=0.980, criterion_snapshot-count-reconciliation=0.960, criterion_filter-and-pagination-contract=0.860, criterion_quote-time-provenance=0.990, criterion_audit-boundaries-and-reporting=0.990, criterion_read-only-risk-boundary=0.990, deferredScope=0.980
- Jev criterion findings: Criterion snapshot-count-reconciliation: met (0.960 confidence) — Report observed representation identities and counts separately from platform metadata, compare exact chain/platform/contract sets, and do not claim a complete inventory.; Criterion filter-and-pagination-contract: met (0.860 confidence) — Separate observed filter-set behavior from response integrity, and distinguish local UI slices from upstream pagination.; Criterion quote-time-provenance: met (0.990 confidence) — Do not treat catalog response time as per-asset quote time; verify dedicated price data against exact representation identity.; Criterion audit-boundaries-and-reporting: met (0.990 confidence) — Keep provider observations read-only, document unresolved behavior accurately, and never label the observed list exhaustive.; Criterion read-only-risk-boundary: met (0.990 confidence) — Jev risk guidance recognizes explicitly approved, bounded read-only requests as potentially low risk while keeping private data, paid actions, writes, wallet signing, broadcast, and deployment outside that allowance.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T19:38:25.149Z
- Phase: `asset-source-coverage-reconciliation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.790`
- Agreement: `true`
- Latency: `1154 ms`
- Phase transition: `pause`
- Transition reason: Criterion filter-and-pagination-contract lacks a sufficiently confident Jev review (0.810); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - snapshot-count-reconciliation (test:asset-directory, typecheck): Report observed representation identities and counts separately from platform metadata, compare exact chain/platform/contract sets, and do not claim a complete inventory. Evidence: Two read-only snapshots about 54 seconds apart observed 488 unique BSC representations (Ondo 442, bStocks 46) versus 538 platform-declared token representations. Exact unfiltered and chain-filtered subsets matched; Chain 1 and CT_501 queries returned zero. The reason and missing identities remain unknown.
  - filter-and-pagination-contract (test:asset-directory): Separate observed filter-set behavior from response integrity, and distinguish local UI slices from upstream pagination. Evidence: Both live snapshots showed all 13 tabId responses equal the unfiltered 488-identity set. Official docs list chain/platform/tab filters but no pagination or total-count marker; local 50-row pages slice the fetched response. Equality does not prove filter failure or universal sector membership.
  - quote-time-provenance (test:asset-directory, test:core-hardening): Do not treat catalog response time as per-asset quote time; verify dedicated price data against exact representation identity. Evidence: Two final probes found no per-row update time on 488 token-list rows. The dedicated price endpoint returned exact matches for both NVDA representations, each with one positive finite price, reference price, and timestamp. Synthetic tests reject missing, unexpected, duplicate, zero-price, and invalid-timestamp cases; no freshness SLA is asserted.
  - audit-boundaries-and-reporting (test:asset-directory, test:core-hardening, typecheck): Keep provider observations read-only, document unresolved behavior accurately, and never label the observed list exhaustive. Evidence: The inspected audit uses signed GET requests only and has no wallet, plan, transaction, or write path. Output separates response integrity from filter equality and leaves catalogCompleteness.proven false; local checks pass.
  - read-only-risk-boundary (test:jev-shadow): Jev risk guidance recognizes explicitly approved, bounded read-only requests as potentially low risk while keeping private data, paid actions, writes, wallet signing, broadcast, and deployment outside that allowance. Evidence: The Jev shadow regression asserts the approved read-only boundary and configured-credential condition while retaining paid-operation and external-write boundaries; the hard 0.85 confidence floor is unchanged.
  - preapproved-next-phase-scope (test:core-product-phase-plan): Advance only to the user-confirmed Phase 9, whose directory-data scope and non-exhaustive coverage boundary are explicit; routine module progression does not require another approval. Evidence: The phase-plan regression verifies that Phase 9 is the next enumerated phase, its scope uses Phase 8 findings without inventing assets/categories/timestamps or claiming completeness, automatic progression is documented, and real-wallet/public-release actions remain outside Phases 8-11.
- Jev confidence by review item: status=0.980, nextAction=0.790, riskLevel=0.980, criterion_snapshot-count-reconciliation=0.850, criterion_filter-and-pagination-contract=0.810, criterion_quote-time-provenance=1.000, criterion_audit-boundaries-and-reporting=0.990, criterion_read-only-risk-boundary=0.990, criterion_preapproved-next-phase-scope=0.930, deferredScope=0.980
- Jev criterion findings: Criterion snapshot-count-reconciliation: met (0.850 confidence) — Report observed representation identities and counts separately from platform metadata, compare exact chain/platform/contract sets, and do not claim a complete inventory.; Criterion filter-and-pagination-contract: met (0.810 confidence) — Separate observed filter-set behavior from response integrity, and distinguish local UI slices from upstream pagination.; Criterion quote-time-provenance: met (1.000 confidence) — Do not treat catalog response time as per-asset quote time; verify dedicated price data against exact representation identity.; Criterion audit-boundaries-and-reporting: met (0.990 confidence) — Keep provider observations read-only, document unresolved behavior accurately, and never label the observed list exhaustive.; Criterion read-only-risk-boundary: met (0.990 confidence) — Jev risk guidance recognizes explicitly approved, bounded read-only requests as potentially low risk while keeping private data, paid actions, writes, wallet signing, broadcast, and deployment outside that allowance.; Criterion preapproved-next-phase-scope: met (0.930 confidence) — Advance only to the user-confirmed Phase 9, whose directory-data scope and non-exhaustive coverage boundary are explicit; routine module progression does not require another approval.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T19:40:20.764Z
- Phase: `asset-source-coverage-reconciliation`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.860`
- Agreement: `true`
- Latency: `936 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - snapshot-count-reconciliation (test:asset-directory, typecheck): Report observed representation identities and counts separately from platform metadata, compare exact chain/platform/contract sets, and do not claim a complete inventory. Evidence: Two read-only snapshots about 54 seconds apart observed 488 unique BSC representations (Ondo 442, bStocks 46) versus 538 platform-declared token representations. Exact unfiltered and chain-filtered subsets matched; Chain 1 and CT_501 queries returned zero. The reason and missing identities remain unknown.
  - filter-and-pagination-contract (test:asset-directory): Separate observed filter-set behavior from response integrity, and distinguish local UI slices from upstream pagination. Evidence: Live probes found all 13 tabId responses equal the unfiltered 488-identity set; this remains only an observation. The local regression verifies exact identity-set equality/difference and disjoint slices of the fetched array. Official docs specify no upstream pagination or total-count marker.
  - quote-time-provenance (test:asset-directory, test:core-hardening): Do not treat catalog response time as per-asset quote time; verify dedicated price data against exact representation identity. Evidence: Two final probes found no per-row update time on 488 token-list rows. The dedicated price endpoint returned exact matches for both NVDA representations, each with one positive finite price, reference price, and timestamp. Synthetic tests reject missing, unexpected, duplicate, zero-price, and invalid-timestamp cases; no freshness SLA is asserted.
  - audit-boundaries-and-reporting (test:asset-directory, test:core-hardening, typecheck): Keep provider observations read-only, document unresolved behavior accurately, and never label the observed list exhaustive. Evidence: The inspected audit uses signed GET requests only and has no wallet, plan, transaction, or write path. Output separates response integrity from filter equality and leaves catalogCompleteness.proven false; local checks pass.
  - read-only-risk-boundary (test:jev-shadow): Jev risk guidance recognizes explicitly approved, bounded read-only requests as potentially low risk while keeping private data, paid actions, writes, wallet signing, broadcast, and deployment outside that allowance. Evidence: The Jev shadow regression asserts the approved read-only boundary and configured-credential condition while retaining paid-operation and external-write boundaries; the hard 0.85 confidence floor is unchanged.
  - preapproved-next-phase-scope (test:core-product-phase-plan, test:jev-shadow): Advance only to the user-confirmed Phase 9, whose directory-data scope and non-exhaustive coverage boundary are explicit; routine module progression does not require another approval. Evidence: The plan test verifies Phase 9 order and scope, no invented assets/categories/timestamps or completeness claims, the automatic-advance rule, and high-risk exclusions. Jev prompt tests confirm approved bounded phases continue automatically without routine reapproval.
- Jev confidence by review item: status=0.980, nextAction=0.960, riskLevel=0.970, criterion_snapshot-count-reconciliation=0.930, criterion_filter-and-pagination-contract=0.860, criterion_quote-time-provenance=0.990, criterion_audit-boundaries-and-reporting=0.980, criterion_read-only-risk-boundary=0.980, criterion_preapproved-next-phase-scope=0.970, deferredScope=0.960
- Jev criterion findings: Criterion snapshot-count-reconciliation: met (0.930 confidence) — Report observed representation identities and counts separately from platform metadata, compare exact chain/platform/contract sets, and do not claim a complete inventory.; Criterion filter-and-pagination-contract: met (0.860 confidence) — Separate observed filter-set behavior from response integrity, and distinguish local UI slices from upstream pagination.; Criterion quote-time-provenance: met (0.990 confidence) — Do not treat catalog response time as per-asset quote time; verify dedicated price data against exact representation identity.; Criterion audit-boundaries-and-reporting: met (0.980 confidence) — Keep provider observations read-only, document unresolved behavior accurately, and never label the observed list exhaustive.; Criterion read-only-risk-boundary: met (0.980 confidence) — Jev risk guidance recognizes explicitly approved, bounded read-only requests as potentially low risk while keeping private data, paid actions, writes, wallet signing, broadcast, and deployment outside that allowance.; Criterion preapproved-next-phase-scope: met (0.970 confidence) — Advance only to the user-confirmed Phase 9, whose directory-data scope and non-exhaustive coverage boundary are explicit; routine module progression does not require another approval.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T20:09:54.717Z
- Phase: `asset-directory-data-quality`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.860`
- Agreement: `true`
- Latency: `1626 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - single-bounded-snapshot (test:web-catalog-client, test:asset-directory): The directory browser makes one bounded catalog request, retains cap information, and rejects inconsistent snapshot metadata. Evidence: Injected-fetch regression asserts exactly one request and preserves a 1000-row partial-bound signal; directory regression asserts returned counts and hasMore for 1001 observed records.
  - truthful-directory-counts (test:asset-directory): Reported counts describe observed source values and do not imply normalized securities or complete market coverage. Evidence: Synthetic directory assertions distinguish exact ticker-string count from representation count, verify returned-row metadata, and retain a visible cap when the local limit is exceeded.
  - exact-timestamped-price-identity (test:asset-directory, test:web-demo): Only a unique positive quote with a valid provider timestamp for the exact chain, platform and contract identity is treated as available; missing, duplicate, invalid and failed results remain explicit. Evidence: Service regressions cover normalized EVM identity matching, out-of-order rows, missing/duplicate/invalid/error states and 100-address batching; route checks assert validated repeated identity parameters and no side effects.
  - displayed-price-time-consistency (test:web-market-presentation): Live table values and displayed quote-time coverage must refer to the same verified quote snapshot; do not fall back to untimestamped directory prices or mix reference-price snapshots. Evidence: Focused presentation tests cover a 1-of-2 partial group, suppression of old directory prices when quotes are missing, no gap calculation without a same-snapshot reference price, preservation of non-price context, and demo labeling.
  - bounded-read-only-price-route (test:web-demo): The timestamped-price route rejects invalid and over-limit requests before provider access and remains read-only. Evidence: Mocked local HTTP regression verifies repeated parameters, invalid-chain/address and 101-identity rejection without additional provider calls, plus sideEffects none.
  - web-integration-build (typecheck, web:next:typecheck, web:next:build): The browser/API implementation typechecks and the production web app builds with the new catalog and quote routes. Evidence: Root TypeScript, web-app TypeScript and optimized Next.js production build complete successfully; the build enumerates the asset-prices and catalog routes.
  - approved-phase-transition-and-safety (test:core-product-phase-plan, test:jev-shadow, test:core-hardening): Continue only to the already approved Phase 10 after all current criteria pass; preserve wallet, transaction, deployment and publication boundaries. Evidence: Phase-plan tests assert Phase 9 to Phase 10 order, automatic continuation and high-risk exclusions; Jev shadow tests assert the confidence floor and linked-criteria coverage; core hardening retains unknown-data behavior.
- Jev confidence by review item: status=0.990, nextAction=0.860, riskLevel=0.910, criterion_single-bounded-snapshot=0.940, criterion_truthful-directory-counts=0.990, criterion_exact-timestamped-price-identity=0.930, criterion_displayed-price-time-consistency=0.870, criterion_bounded-read-only-price-route=1.000, criterion_web-integration-build=1.000, criterion_approved-phase-transition-and-safety=0.910, deferredScope=0.990
- Jev criterion findings: Criterion single-bounded-snapshot: met (0.940 confidence) — The directory browser makes one bounded catalog request, retains cap information, and rejects inconsistent snapshot metadata.; Criterion truthful-directory-counts: met (0.990 confidence) — Reported counts describe observed source values and do not imply normalized securities or complete market coverage.; Criterion exact-timestamped-price-identity: met (0.930 confidence) — Only a unique positive quote with a valid provider timestamp for the exact chain, platform and contract identity is treated as available; missing, duplicate, invalid and failed results remain explicit.; Criterion displayed-price-time-consistency: met (0.870 confidence) — Live table values and displayed quote-time coverage must refer to the same verified quote snapshot; do not fall back to untimestamped directory prices or mix reference-price snapshots.; Criterion bounded-read-only-price-route: met (1.000 confidence) — The timestamped-price route rejects invalid and over-limit requests before provider access and remains read-only.; Criterion web-integration-build: met (1.000 confidence) — The browser/API implementation typechecks and the production web app builds with the new catalog and quote routes.; Criterion approved-phase-transition-and-safety: met (0.910 confidence) — Continue only to the already approved Phase 10 after all current criteria pass; preserve wallet, transaction, deployment and publication boundaries.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

## Asset detail market-context refinement — 2026-09-30 (Jev review pending)

The selected-asset workspace now makes clear which issuer representation is active and keeps market numbers tied to that representation. A token price describes the selected on-chain representation; the reference price describes the underlying asset. In live mode both are taken from one timestamped quote snapshot, and the interface withholds them rather than silently substituting the directory's untimestamped values when the quote is missing or invalid. The five-minute “stale” marker is a conservative interface heuristic, not a promise about provider update cadence. Market status distinguishes open, closed, off-hours and unknown, while stating that no separate status-update time is supplied.

The chart labels the selected issuer, interval, last-bar time in UTC and the source response time as a separate field. The provider does not currently supply that response-time field, so the UI says so plainly. A failed refresh keeps the last known chart only with a visible stale warning; no simulated candles are introduced. The independent review's lifecycle/success-route test gaps were repaired and confirmed in a follow-up review. The first Jev gate passed all selected tests but paused below the confidence threshold (0.810); the chart timestamp-pair behavior and already-approved Phase 11 transition wording were made more explicit and directly tested. A strengthened Jev review is pending; no trade, signature or broadcast is performed by this refinement.

### Jev phase-gate record — 2026-09-29T20:31:31.509Z
- Phase: `asset-detail-market-context`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.810`
- Agreement: `true`
- Latency: `1748 ms`
- Phase transition: `pause`
- Transition reason: Criterion candle-time-provenance lacks a sufficiently confident Jev review (0.830); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - timestamped-quote-coherence (test:web-market-presentation, test:web-market-freshness): In live mode, display token price, underlying reference price, and any derived gap only from the same valid timestamped quote for the selected representation; missing or invalid quotes must not fall back to untimestamped directory prices. Evidence: Presentation regressions verify missing quotes blank token/reference/gap while preserving non-price context, and valid same-snapshot quotes compute the gap; freshness regressions cover the five-minute display heuristic, invalid future times, and explicit states.
  - identity-bound-refresh (test:web-market-freshness, test:web-demo): Bind quote/chart data and loading state to the selected chain, platform, contract, mode, and chart interval; only retain a failed refresh as stale when it belongs to the same active identity. Evidence: Deterministic checks cover exact representation equality, same-identity stale retention, cross-issuer and cross-interval state hiding; HTTP integration verifies successful candles and rejects a wrong issuer or contract.
  - candle-time-provenance (test:web-market-freshness, test:web-demo): Show last-bar time separately from provider-response time in UTC, and never substitute client request time when the provider response time is absent. Evidence: The route regression asserts asOf equals the final normalized candle timestamp and sourceResponseTimestampMs remains null; freshness tests verify UTC formatting and invalid/missing time behavior.
  - market-state-coverage (test:web-market-freshness): Distinguish open/regular, closed/paused/halted, offhours/preopen/afterhours, and unknown market states without turning off-hours into unknown. Evidence: Pure-function regressions exercise every documented status alias and the unknown fallback.
  - integration-and-build (typecheck, web:next:typecheck, build, web:next:build, test:web-market-freshness, test:web-market-presentation, test:web-demo): The selected asset detail changes typecheck and compile in both the SDK/API workspace and Next.js app, and its deterministic regressions pass. Evidence: Root and web TypeScript checks, root build, optimized Next.js production build, quote-presentation/freshness tests, and local Demo/live-mock HTTP integration complete successfully.
  - approved-next-phase-and-safety (test:core-product-phase-plan, test:jev-shadow, test:core-hardening): Continue only to the user-approved Phase 11 after Phase 10 evidence passes, preserving read-only research and all wallet, trade, signing, broadcast, deployment, and publication boundaries. Evidence: The roadmap regression verifies Phase 10→11 ordering and auto-advance scope; Jev/core regressions enforce linked evidence, confidence floor, unknown-data handling, and safety boundaries.
- Jev confidence by review item: status=0.960, nextAction=0.990, riskLevel=1.000, criterion_timestamped-quote-coherence=0.960, criterion_identity-bound-refresh=0.970, criterion_candle-time-provenance=0.830, criterion_market-state-coverage=0.890, criterion_integration-and-build=0.980, criterion_approved-next-phase-and-safety=0.810
- Jev criterion findings: Criterion timestamped-quote-coherence: met (0.960 confidence) — In live mode, display token price, underlying reference price, and any derived gap only from the same valid timestamped quote for the selected representation; missing or invalid quotes must not fall back to untimestamped directory prices.; Criterion identity-bound-refresh: met (0.970 confidence) — Bind quote/chart data and loading state to the selected chain, platform, contract, mode, and chart interval; only retain a failed refresh as stale when it belongs to the same active identity.; Criterion candle-time-provenance: met (0.830 confidence) — Show last-bar time separately from provider-response time in UTC, and never substitute client request time when the provider response time is absent.; Criterion market-state-coverage: met (0.890 confidence) — Distinguish open/regular, closed/paused/halted, offhours/preopen/afterhours, and unknown market states without turning off-hours into unknown.; Criterion integration-and-build: met (0.980 confidence) — The selected asset detail changes typecheck and compile in both the SDK/API workspace and Next.js app, and its deterministic regressions pass.; Criterion approved-next-phase-and-safety: met (0.810 confidence) — Continue only to the user-approved Phase 11 after Phase 10 evidence passes, preserving read-only research and all wallet, trade, signing, broadcast, deployment, and publication boundaries.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T20:34:17.977Z
- Phase: `asset-detail-market-context`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.900`
- Agreement: `true`
- Latency: `905 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - timestamped-quote-coherence (test:web-market-presentation, test:web-market-freshness): Live representation price, underlying reference price and derived gap must come only from one valid timestamped quote snapshot; absent or invalid quotes never fall back to untimestamped catalog prices. Evidence: Deterministic presentation cases verify missing/invalid snapshots suppress price, reference and gap while preserving volume; available same-snapshot values compute the gap. Freshness cases verify the five-minute UI heuristic and reject future-invalid timestamps.
  - identity-bound-refresh (test:web-market-freshness, test:web-demo): Bind displayed quote and chart data/status to the selected chain, issuer platform, contract, mode and chart interval. A failed poll may retain data only for the exact same identity and must label it stale. Evidence: Tests cover normalized chain/platform/contract identity, same-identity stale retention, prior-issuer and prior-interval states hidden as loading, a successful chart response, and wrong platform/contract rejection.
  - bar-and-provider-time-separation (test:web-market-freshness, test:web-demo): Treat candle asOf as the final bar time; display it in UTC separately from provider response time. When the provider did not supply a response timestamp, display it as not supplied and do not substitute client time. Evidence: candleTimestampLabels tests assert UTC last-bar formatting, preserve a missing provider timestamp as absent, and keep supplied bar/response timestamps distinct. The HTTP route test asserts asOf equals the final normalized candle and sourceResponseTimestampMs remains null.
  - market-state-coverage (test:web-market-freshness): Map open/regular, closed/paused/halted, offhours/preopen/afterhours, and unknown into distinct accurate UI groups. Evidence: Deterministic assertions enumerate every accepted source status alias and unknown fallback.
  - integration-and-build (typecheck, web:next:typecheck, build, web:next:build, test:web-market-freshness, test:web-market-presentation, test:web-demo): The selected-asset detail context typechecks, builds and passes deterministic integration regressions in both root and Next.js workspaces. Evidence: Root/web typechecks and builds pass; quote coherence/freshness tests and local mock HTTP tests pass for ready/unavailable candles, exact identity and read-only side-effect reporting.
  - approved-next-transition (test:core-product-phase-plan): After this Phase 10 Jev gate advances, proceed only to Phase 11 because it is explicitly the user-approved next low-risk phase in the existing roadmap. Evidence: The roadmap regression asserts Phase 10 to Phase 11 order, marks Phase 11 as the user-approved next transition after Phase 10 Jev advance, verifies the automatic advancement rule, and excludes all high-risk actions.
  - side-effect-safety (test:web-demo, test:jev-shadow, test:core-hardening): Keep this phase read-only and never infer authorization for trading, wallet/signature use, broadcast, deployment or publication from Jev approval. Evidence: Local HTTP integration reports sideEffects none; Jev shadow and core hardening regressions enforce explicit approval boundaries, unknown-data behavior, and that review cannot authorize excluded actions.
- Jev confidence by review item: status=0.960, nextAction=0.990, riskLevel=1.000, criterion_timestamped-quote-coherence=0.980, criterion_identity-bound-refresh=0.920, criterion_bar-and-provider-time-separation=0.990, criterion_market-state-coverage=0.900, criterion_integration-and-build=0.970, criterion_approved-next-transition=0.920, criterion_side-effect-safety=0.950
- Jev criterion findings: Criterion timestamped-quote-coherence: met (0.980 confidence) — Live representation price, underlying reference price and derived gap must come only from one valid timestamped quote snapshot; absent or invalid quotes never fall back to untimestamped catalog prices.; Criterion identity-bound-refresh: met (0.920 confidence) — Bind displayed quote and chart data/status to the selected chain, issuer platform, contract, mode and chart interval. A failed poll may retain data only for the exact same identity and must label it stale.; Criterion bar-and-provider-time-separation: met (0.990 confidence) — Treat candle asOf as the final bar time; display it in UTC separately from provider response time. When the provider did not supply a response timestamp, display it as not supplied and do not substitute client time.; Criterion market-state-coverage: met (0.900 confidence) — Map open/regular, closed/paused/halted, offhours/preopen/afterhours, and unknown into distinct accurate UI groups.; Criterion integration-and-build: met (0.970 confidence) — The selected-asset detail context typechecks, builds and passes deterministic integration regressions in both root and Next.js workspaces.; Criterion approved-next-transition: met (0.920 confidence) — After this Phase 10 Jev gate advances, proceed only to Phase 11 because it is explicitly the user-approved next low-risk phase in the existing roadmap.; Criterion side-effect-safety: met (0.950 confidence) — Keep this phase read-only and never infer authorization for trading, wallet/signature use, broadcast, deployment or publication from Jev approval.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

## Phase 11 — SDK and existing-Agent journey (Jev approved; confidence 0.890)

The independent developer path and Agent path now have a stronger shared evidence contract. SDK and MCP market contexts identify which Binance Web3 endpoint supplied timestamped prices versus market-state/catalog fields. Rendered evidence cards include each field group beside its endpoint. Results preserve exact issuer/chain/contract identity, separate provider response time from per-asset price update time, and keep absent liquidity, unknown status, and invalid or non-positive prices visible as gaps rather than valid values. Those gaps prevent a representation from being labeled fully complete.

A review found that partial upstream search results could evade ticker ambiguity checks for comparative prompts. The resolver now checks the catalog when a query asks to compare assets and blocks multiple underlyings, while retaining the direct lookup fast path for a plain ticker. Regressions exercise both Chinese joiners and bare English `NVDA and TSLA` when the upstream returns only one result. Another review found zero/negative provider prices were not rejected in the shared SDK/MCP market-context path; strict positive-decimal validation now omits invalid values and surfaces a warning. Tests cover zero, negative, malformed and scientific-notation prices.

Verification passed for local SDK package installation/import/types, MCP natural-language research/discovery, SDK↔MCP identity parity, field source/time provenance, unknown data, no-trade side effects, and the deterministic Demo path. Live read-only NVDA verification returned two issuer representations from both routes; MCP reported `sideEffects: none`. No transaction, wallet access, signature, quote, broadcast or package publication occurred.

This does not promise that every third-party Agent host will select the right MCP tool automatically: the integration invokes the research tool directly with natural-language input and verifies the server journey, not universal host-side tool selection. A timestamp also does not imply a provider-guaranteed freshness window. Final Jev re-review passed at confidence 0.890 with 17/17 selected checks and 5/5 criteria met. This is local developer-consumption readiness only—not npm publication, public deployment, funded execution or settlement.

### Jev phase-gate record — 2026-09-29T20:55:59.267Z
- Phase: `sdk-mcp-core-journey`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.860`
- Agreement: `true`
- Latency: `1473 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - standalone-sdk-consumer (typecheck, build, test:cleanroom, test:distribution, test:sdk-example, test:onboarding): An independent developer can install and use the built SDK without Ariadne website or MCP runtime dependencies, with public exports and declarations intact. Evidence: The final gate rebuilds the SDK and installs its local tarball into a disposable consumer, verifies ESM runtime imports, TypeScript declarations and package root exports, and checks documented setup/configuration without publishing.
  - sdk-mcp-identity-and-provenance (test:mcp-natural-language, test:domain, test:presentation): Standalone SDK and natural-language MCP return the same exact representation identities and disclose the verified provider endpoints and distinct per-asset update timestamps. Evidence: The live read-only integration compares SDK and MCP NVDA identity sets by chain/platform/contract and checks Binance Web3 price and catalog endpoint provenance, separate response and per-asset timestamps, and visible source presentation; deterministic tests cover the mapping.
  - natural-language-ambiguity-and-data-quality (test:asset-intent-query, test:agent-model, test:demo-mode): Chinese and English requests resolve safely; multiple underlying assets are never silently reduced to a partial upstream hit, and unknown market evidence is represented as incomplete. Evidence: Synthetic regressions cover Chinese/English intent, unknown symbols, and both English and Chinese compound prompts where the mocked upstream returns only one of two assets; Demo MCP and Agent-model checks verify ambiguity and missing/unknown values remain blocked or incomplete.
  - read-only-research-boundary (test:mcp-natural-language, test:mcp-enrichment, test:core-hardening): Research-only MCP requests expose warnings and do not create wallet, quote, signing, transaction or broadcast side effects. Evidence: Live research/discovery returns sideEffects none and no-trade follow-ups; deterministic MCP enrichment and core-hardening tests retain fail-closed identity and unknown-data behavior without invoking transaction operations.
  - approved-phase-closure-and-safety (test:core-product-phase-plan, test:jev-shadow, test:core-hardening): Advance only after every linked check passes; preserve user-approved scope and do not infer authorization for publishing, deployment, wallet use, signing, trading or broadcast. Evidence: The phase-plan regression verifies Phase 10 approval, active Phase 11 scope, automatic approved progression and high-risk exclusions; Jev/core safety regressions enforce linked evidence, confidence floor and non-authorization boundaries.
- Jev confidence by review item: status=0.980, nextAction=0.990, riskLevel=1.000, criterion_standalone-sdk-consumer=0.980, criterion_sdk-mcp-identity-and-provenance=0.960, criterion_natural-language-ambiguity-and-data-quality=0.960, criterion_read-only-research-boundary=0.980, criterion_approved-phase-closure-and-safety=0.860, deferredScope=1.000
- Jev criterion findings: Criterion standalone-sdk-consumer: met (0.980 confidence) — An independent developer can install and use the built SDK without Ariadne website or MCP runtime dependencies, with public exports and declarations intact.; Criterion sdk-mcp-identity-and-provenance: met (0.960 confidence) — Standalone SDK and natural-language MCP return the same exact representation identities and disclose the verified provider endpoints and distinct per-asset update timestamps.; Criterion natural-language-ambiguity-and-data-quality: met (0.960 confidence) — Chinese and English requests resolve safely; multiple underlying assets are never silently reduced to a partial upstream hit, and unknown market evidence is represented as incomplete.; Criterion read-only-research-boundary: met (0.980 confidence) — Research-only MCP requests expose warnings and do not create wallet, quote, signing, transaction or broadcast side effects.; Criterion approved-phase-closure-and-safety: met (0.860 confidence) — Advance only after every linked check passes; preserve user-approved scope and do not infer authorization for publishing, deployment, wallet use, signing, trading or broadcast.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T21:00:18.491Z
- Phase: `sdk-mcp-core-journey`
- Jev provider: `deterministic-fallback`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `15 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - standalone-sdk-consumer (typecheck, build, test:cleanroom, test:distribution, test:sdk-example, test:onboarding): An independent developer can install and use the built SDK without Ariadne website or MCP runtime dependencies, with public exports and declarations intact. Evidence: The gate rebuilds the SDK and installs its local tarball into a disposable consumer, verifies ESM runtime imports, TypeScript declarations and package root exports, and checks documented setup without publishing.
  - sdk-mcp-identity-and-provenance (test:mcp-natural-language, test:domain, test:presentation): Standalone SDK and natural-language MCP return the same exact representation identities; market values are valid positive prices and rendered source evidence maps fields to provider endpoints and distinct timestamps. Evidence: The live read-only integration compares SDK and MCP NVDA identity sets by chain/platform/contract and checks source endpoints and timestamps. Deterministic service tests reject zero/negative prices; presentation tests assert each field group is shown beside its endpoint.
  - natural-language-ambiguity-and-data-quality (test:asset-intent-query, test:agent-model, test:demo-mode, test:domain): Chinese and English requests resolve safely; multiple underlying assets are never silently reduced to a partial upstream hit, and invalid or unknown market evidence remains visibly incomplete. Evidence: Synthetic regressions cover Chinese and English compound prompts including bare NVDA and TSLA with only one API hit, plus zero/negative prices, unknown symbols and incomplete evidence handling.
  - read-only-research-boundary (test:mcp-natural-language, test:mcp-enrichment, test:core-hardening): Research-only MCP requests expose warnings and do not create wallet, quote, signing, transaction or broadcast side effects. Evidence: Live research/discovery returns sideEffects none and deterministic MCP/core-hardening regressions preserve no-transaction behavior and fail-closed data boundaries.
  - approved-phase-closure-and-safety (test:core-product-phase-plan, test:jev-shadow, test:core-hardening): Advance only after every linked check passes; preserve user-approved scope and do not infer authorization for publishing, deployment, wallet use, signing, trading or broadcast. Evidence: Phase-plan, Jev and core safety regressions enforce acceptance-evidence linkage, confidence floor, approved phase sequence and excluded high-risk actions. Documentation explicitly states the MCP integration test invokes the research tool and does not prove universal Agent auto-selection.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T21:02:24.311Z
- Phase: `sdk-mcp-core-journey`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.860`
- Agreement: `true`
- Latency: `1706 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - standalone-sdk-consumer (typecheck, build, test:cleanroom, test:distribution, test:sdk-example, test:onboarding): An independent developer can install and use the built SDK without Ariadne website or MCP runtime dependencies, with public exports and declarations intact. Evidence: The gate rebuilds the SDK and installs its local tarball into a disposable consumer, verifies ESM runtime imports, TypeScript declarations and package root exports, and checks documented setup without publishing.
  - sdk-mcp-identity-and-provenance (test:mcp-natural-language, test:domain, test:presentation): Standalone SDK and natural-language MCP return the same exact representation identities; market values are valid positive prices and rendered source evidence maps fields to provider endpoints and distinct timestamps. Evidence: The live read-only integration compares SDK and MCP NVDA identity sets by chain/platform/contract and checks source endpoints and timestamps. Deterministic service tests reject zero/negative prices; presentation tests assert each field group is shown beside its endpoint.
  - natural-language-ambiguity-and-data-quality (test:asset-intent-query, test:agent-model, test:demo-mode, test:domain): Chinese and English requests resolve safely; multiple underlying assets are never silently reduced to a partial upstream hit, and invalid or unknown market evidence remains visibly incomplete. Evidence: Synthetic regressions cover Chinese and English compound prompts including bare NVDA and TSLA with only one API hit, plus zero/negative prices, unknown symbols and incomplete evidence handling.
  - read-only-research-boundary (test:mcp-natural-language, test:mcp-enrichment, test:core-hardening): Research-only MCP requests expose warnings and do not create wallet, quote, signing, transaction or broadcast side effects. Evidence: Live research/discovery returns sideEffects none and deterministic MCP/core-hardening regressions preserve no-transaction behavior and fail-closed data boundaries.
  - approved-phase-closure-and-safety (test:core-product-phase-plan, test:jev-shadow, test:core-hardening): Advance only after every linked check passes; preserve user-approved scope and do not infer authorization for publishing, deployment, wallet use, signing, trading or broadcast. Evidence: Phase-plan, Jev and core safety regressions enforce acceptance-evidence linkage, confidence floor, approved phase sequence and excluded high-risk actions. Documentation explicitly states the MCP integration test invokes the research tool and does not prove universal Agent auto-selection.
- Jev confidence by review item: status=0.960, nextAction=0.990, riskLevel=1.000, criterion_standalone-sdk-consumer=0.980, criterion_sdk-mcp-identity-and-provenance=0.940, criterion_natural-language-ambiguity-and-data-quality=0.860, criterion_read-only-research-boundary=0.870, criterion_approved-phase-closure-and-safety=0.940
- Jev criterion findings: Criterion standalone-sdk-consumer: met (0.980 confidence) — An independent developer can install and use the built SDK without Ariadne website or MCP runtime dependencies, with public exports and declarations intact.; Criterion sdk-mcp-identity-and-provenance: met (0.940 confidence) — Standalone SDK and natural-language MCP return the same exact representation identities; market values are valid positive prices and rendered source evidence maps fields to provider endpoints and distinct timestamps.; Criterion natural-language-ambiguity-and-data-quality: met (0.860 confidence) — Chinese and English requests resolve safely; multiple underlying assets are never silently reduced to a partial upstream hit, and invalid or unknown market evidence remains visibly incomplete.; Criterion read-only-research-boundary: met (0.870 confidence) — Research-only MCP requests expose warnings and do not create wallet, quote, signing, transaction or broadcast side effects.; Criterion approved-phase-closure-and-safety: met (0.940 confidence) — Advance only after every linked check passes; preserve user-approved scope and do not infer authorization for publishing, deployment, wallet use, signing, trading or broadcast.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T21:03:26.670Z
- Phase: `sdk-mcp-core-journey`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.890`
- Agreement: `true`
- Latency: `1170 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - standalone-sdk-consumer (typecheck, build, test:cleanroom, test:distribution, test:sdk-example, test:onboarding): An independent developer can install and use the built SDK without Ariadne website or MCP runtime dependencies, with public exports and declarations intact. Evidence: The gate rebuilds the SDK and installs its local tarball into a disposable consumer, verifies ESM runtime imports, TypeScript declarations and package root exports, and checks documented setup without publishing.
  - sdk-mcp-identity-and-provenance (test:mcp-natural-language, test:domain, test:presentation): Standalone SDK and natural-language MCP return the same exact representation identities; market values are valid positive prices and rendered source evidence maps fields to provider endpoints and distinct timestamps. Evidence: The live read-only integration compares SDK and MCP NVDA identity sets by chain/platform/contract and checks source endpoints and timestamps. Deterministic service tests reject zero, negative, malformed and scientific-notation prices; presentation tests assert each field group is shown beside its endpoint.
  - natural-language-ambiguity-and-data-quality (test:asset-intent-query, test:agent-model, test:demo-mode, test:domain): Chinese and English requests resolve safely; multiple underlying assets are never silently reduced to a partial upstream hit, and invalid or unknown market evidence remains visibly incomplete. Evidence: Synthetic regressions cover Chinese and English compound prompts including bare NVDA and TSLA with only one API hit, plus zero/negative/malformed prices, unknown symbols and incomplete evidence handling.
  - read-only-research-boundary (test:mcp-natural-language, test:mcp-enrichment, test:core-hardening): Research-only MCP requests expose warnings and do not create wallet, quote, signing, transaction or broadcast side effects. Evidence: Live research/discovery returns sideEffects none and deterministic MCP/core-hardening regressions preserve no-transaction behavior and fail-closed data boundaries.
  - approved-phase-closure-and-safety (test:core-product-phase-plan, test:jev-shadow, test:core-hardening): Advance only after every linked check passes; preserve user-approved scope and do not infer authorization for publishing, deployment, wallet use, signing, trading or broadcast. Evidence: Phase-plan, Jev and core safety regressions enforce acceptance-evidence linkage, confidence floor, approved phase sequence and excluded high-risk actions. Documentation explicitly states the MCP integration test invokes the research tool and does not prove universal Agent auto-selection.
- Jev confidence by review item: status=0.950, nextAction=0.980, riskLevel=1.000, criterion_standalone-sdk-consumer=0.990, criterion_sdk-mcp-identity-and-provenance=0.970, criterion_natural-language-ambiguity-and-data-quality=0.890, criterion_read-only-research-boundary=0.960, criterion_approved-phase-closure-and-safety=0.930
- Jev criterion findings: Criterion standalone-sdk-consumer: met (0.990 confidence) — An independent developer can install and use the built SDK without Ariadne website or MCP runtime dependencies, with public exports and declarations intact.; Criterion sdk-mcp-identity-and-provenance: met (0.970 confidence) — Standalone SDK and natural-language MCP return the same exact representation identities; market values are valid positive prices and rendered source evidence maps fields to provider endpoints and distinct timestamps.; Criterion natural-language-ambiguity-and-data-quality: met (0.890 confidence) — Chinese and English requests resolve safely; multiple underlying assets are never silently reduced to a partial upstream hit, and invalid or unknown market evidence remains visibly incomplete.; Criterion read-only-research-boundary: met (0.960 confidence) — Research-only MCP requests expose warnings and do not create wallet, quote, signing, transaction or broadcast side effects.; Criterion approved-phase-closure-and-safety: met (0.930 confidence) — Advance only after every linked check passes; preserve user-approved scope and do not infer authorization for publishing, deployment, wallet use, signing, trading or broadcast.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T22:59:24.541Z
- Phase: `mcp-native-research-view`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `14 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - app-resource (test:mcp-app-ui): The three research tools reference one valid MCP Apps resource and return identical text and structured data. Evidence: The stdio demo test lists all three tool descriptors and the ui resource, reads its MCP Apps MIME type and bundled client, and deep-compares text JSON with structuredContent.
  - data-parity (test:mcp-app-ui): A Chinese NVDA request preserves exact representation identities and displays only supplied market values, timestamps, sources and warnings. Evidence: One Chinese request runs through discovery, comparison and research; tests compare exact identity sets and assert the rendered panel contains timestamp, provenance, data-quality and caveat sections.
  - safe-view (test:mcp-app-ui): The research UI escapes untrusted values, rejects unsafe links and adds no wallet, signing, order or broadcast control. Evidence: A hostile payload containing HTML/script/SVG and a javascript URL is rendered; tests verify escaping, unsafe-link omission, read-only labels and absent transaction controls.
  - regression-build-scope (typecheck, build, test:demo-mode, test:core-product-phase-plan): Existing demo research behavior and approved scope boundaries remain intact, and the implementation typechecks and builds. Evidence: Typecheck and build pass; demo tests retain Chinese NVDA, ambiguity and forged-plan rejection; phase-plan test preserves website and execution exclusions.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T23:00:27.888Z
- Phase: `mcp-native-research-view`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.740`
- Agreement: `true`
- Latency: `26110 ms`
- Phase transition: `pause`
- Transition reason: Criterion data-parity lacks a sufficiently confident Jev review (0.740); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - app-resource (test:mcp-app-ui): The three research tools reference one valid MCP Apps resource and return identical text and structured data. Evidence: The stdio demo test lists all three tool descriptors and the ui resource, reads its MCP Apps MIME type and bundled client, and deep-compares text JSON with structuredContent.
  - data-parity (test:mcp-app-ui): A Chinese NVDA request preserves exact representation identities and displays only supplied market values, timestamps, sources and warnings. Evidence: One Chinese request runs through discovery, comparison and research; tests compare exact identity sets and assert the rendered panel contains timestamp, provenance, data-quality and caveat sections.
  - safe-view (test:mcp-app-ui): The research UI escapes untrusted values, rejects unsafe links and adds no wallet, signing, order or broadcast control. Evidence: A hostile payload containing HTML/script/SVG and a javascript URL is rendered; tests verify escaping, unsafe-link omission, read-only labels and absent transaction controls.
  - regression-build-scope (typecheck, build, test:demo-mode, test:core-product-phase-plan): Existing demo research behavior and approved scope boundaries remain intact, and the implementation typechecks and builds. Evidence: Typecheck and build pass; demo tests retain Chinese NVDA, ambiguity and forged-plan rejection; phase-plan test preserves website and execution exclusions.
- Jev confidence by review item: status=0.990, nextAction=0.990, riskLevel=1.000, criterion_app-resource=0.950, criterion_data-parity=0.740, criterion_safe-view=0.990, criterion_regression-build-scope=0.990, deferredScope=1.000
- Jev criterion findings: Criterion app-resource: met (0.950 confidence) — The three research tools reference one valid MCP Apps resource and return identical text and structured data.; Criterion data-parity: met (0.740 confidence) — A Chinese NVDA request preserves exact representation identities and displays only supplied market values, timestamps, sources and warnings.; Criterion safe-view: met (0.990 confidence) — The research UI escapes untrusted values, rejects unsafe links and adds no wallet, signing, order or broadcast control.; Criterion regression-build-scope: met (0.990 confidence) — Existing demo research behavior and approved scope boundaries remain intact, and the implementation typechecks and builds.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-29T23:02:12.630Z
- Phase: `mcp-native-research-view`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.960`
- Agreement: `true`
- Latency: `1603 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - app-resource (test:mcp-app-ui): The three research tools reference one valid MCP Apps resource and return identical text and structured data. Evidence: The stdio demo test lists all three tool descriptors and the shared ui resource, reads its MCP Apps MIME type and bundled client, and deep-compares text JSON with structuredContent.
  - data-parity (test:mcp-app-ui): A Chinese NVDA request preserves identical exact asset identities and market evidence across all three MCP tools; the UI shows the exact supplied prices, timestamps, provenance, missing fields and warnings without claiming an SLA. Evidence: Deterministic demo requests compare per-asset token/reference price, gap, quote timestamp, provenance, missing fields and warnings across discovery, comparison and research. The rendered HTML is then checked for every returned value, separately verifies the provider response timestamp, and rejects freshness-guarantee labels.
  - safe-view (test:mcp-app-ui): The research UI escapes untrusted values, rejects unsafe links and adds no wallet, signing, order or broadcast control. Evidence: A hostile payload containing HTML/script/SVG and a javascript URL is rendered; tests verify escaping, unsafe-link omission, read-only labels and absent transaction controls.
  - regression-build-scope (typecheck, build, test:demo-mode, test:core-product-phase-plan): Existing demo research behavior and approved scope boundaries remain intact, and the implementation typechecks and builds. Evidence: Typecheck and build pass; demo tests retain Chinese NVDA, ambiguity and forged-plan rejection; phase-plan test preserves website and execution exclusions.
- Jev confidence by review item: status=0.990, nextAction=0.990, riskLevel=1.000, criterion_app-resource=0.980, criterion_data-parity=0.960, criterion_safe-view=0.990, criterion_regression-build-scope=0.980, deferredScope=1.000
- Jev criterion findings: Criterion app-resource: met (0.980 confidence) — The three research tools reference one valid MCP Apps resource and return identical text and structured data.; Criterion data-parity: met (0.960 confidence) — A Chinese NVDA request preserves identical exact asset identities and market evidence across all three MCP tools; the UI shows the exact supplied prices, timestamps, provenance, missing fields and warnings without claiming an SLA.; Criterion safe-view: met (0.990 confidence) — The research UI escapes untrusted values, rejects unsafe links and adds no wallet, signing, order or broadcast control.; Criterion regression-build-scope: met (0.980 confidence) — Existing demo research behavior and approved scope boundaries remain intact, and the implementation typechecks and builds.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T01:38:02.023Z
- Phase: `mcp-agent-host-rendering-parity`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.530`
- Agreement: `true`
- Latency: `1512 ms`
- Phase transition: `pause`
- Transition reason: Criterion host-rendering lacks a sufficiently confident Jev review (0.530); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - host-rendering (test:mcp-app-ui, test:core-product-phase-plan): The MCP Apps research view is visible in the Agent conversation and remains read-only without wallet or trading controls. Evidence: Offline MCP Apps integration verifies resource linkage, bundled view, supplied data rendering and safe controls; the user directly confirms the research card is visible in this Codex conversation.
  - live-data-parity (test:mcp-app-ui): Live MCP text and structured results agree on the exact NVDA representations, market evidence, timestamps, provenance, warnings and side-effect boundary. Evidence: Two post-reconnect read-only calls resolve two BNB NVDA representations; parsing the text JSON exactly matches structuredContent, both source endpoints and quote times are present, warnings remain visible, and sideEffects is none.
  - local-regression-and-scope (typecheck, build, test:demo-mode, test:core-product-phase-plan): The UI integration, existing demo safety behavior, build and phase scope regressions pass without website, wallet or execution changes. Evidence: Selected checks verify types, compilation, natural-language demo behavior, ambiguity/action rejection and the approved Phase 12-13 scope boundaries.
- Jev confidence by review item: status=0.890, nextAction=0.980, riskLevel=1.000, criterion_host-rendering=0.530, criterion_live-data-parity=0.860, criterion_local-regression-and-scope=0.560
- Jev criterion findings: Criterion host-rendering: met (0.530 confidence) — The MCP Apps research view is visible in the Agent conversation and remains read-only without wallet or trading controls.; Criterion live-data-parity: met (0.860 confidence) — Live MCP text and structured results agree on the exact NVDA representations, market evidence, timestamps, provenance, warnings and side-effect boundary.; Criterion local-regression-and-scope: met (0.560 confidence) — The UI integration, existing demo safety behavior, build and phase scope regressions pass without website, wallet or execution changes.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T01:48:22.248Z
- Phase: `mcp-agent-host-rendering-parity`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.810`
- Agreement: `true`
- Latency: `759 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the minimum threshold (0.85); the least-certain review item is status (0.810). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - host-rendering (test:mcp-app-ui, test:core-product-phase-plan): The user confirms the research card is visible in this Agent conversation, and the actual bundled MCP Apps client completes the protocol handshake and renders the host-delivered research result without wallet or trading controls. Evidence: The user directly confirms actual current-conversation visibility. Separately, test:mcp-app-ui executes the exact bundled app in a deterministic host harness, completes ui/initialize, delivers a tool-result notification, compares rendered markup to the expected supplied view, and asserts no wallet or trade affordances. This is runtime protocol evidence, not screenshot/browser evidence.
  - live-data-parity (test:mcp-app-ui): Live MCP text and structured results agree on exact NVDA representations, market evidence, timestamps, provenance, warnings and no-side-effect behavior. Evidence: Two post-reconnect read-only calls resolved two BNB NVDA representations. Parsing each text result exactly matched structuredContent, including per-representation price/timestamp/provenance and source endpoints; unknown status and missing liquidity warnings remained explicit; outcome.sideEffects was none.
  - local-regression-and-scope (typecheck, build, test:demo-mode, test:core-product-phase-plan): The bundled UI protocol flow, existing Demo safety behavior, build and phase-scope checks pass without website, wallet or execution-surface changes. Evidence: The focused integration runs the resource bundle and tests structured/text-only host delivery plus view switching. Typecheck/build, Demo natural-language/ambiguity/action-safety checks and the roadmap boundary check pass. Phase 12-13 changes do not modify website/UI surfaces; no wallet, signing, broadcast, deployment or publication was used.
- Jev confidence by review item: status=0.810, nextAction=0.970, riskLevel=1.000, criterion_host-rendering=0.850, criterion_live-data-parity=0.880, criterion_local-regression-and-scope=0.940
- Jev criterion findings: Criterion host-rendering: met (0.850 confidence) — The user confirms the research card is visible in this Agent conversation, and the actual bundled MCP Apps client completes the protocol handshake and renders the host-delivered research result without wallet or trading controls.; Criterion live-data-parity: met (0.880 confidence) — Live MCP text and structured results agree on exact NVDA representations, market evidence, timestamps, provenance, warnings and no-side-effect behavior.; Criterion local-regression-and-scope: met (0.940 confidence) — The bundled UI protocol flow, existing Demo safety behavior, build and phase-scope checks pass without website, wallet or execution-surface changes.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T01:53:02.766Z
- Phase: `mcp-agent-host-rendering-parity`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.520`
- Agreement: `true`
- Latency: `979 ms`
- Phase transition: `pause`
- Transition reason: Criterion host-rendering lacks a sufficiently confident Jev review (0.730); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - host-rendering (test:mcp-app-ui, test:core-product-phase-plan): The user confirms the research card is visible in this Agent conversation, and the actual bundled MCP Apps client completes the handshake and renders host-delivered research without wallet or trading controls. Evidence: User directly confirms actual current-conversation visibility. Separately, the exact inline bundle completes ui/initialize in a deterministic protocol-host harness, renders the host tool-result, matches expected view markup and exposes no wallet/trade affordances. Harness is runtime protocol evidence, not screenshot/browser evidence.
  - live-data-parity (test:mcp-app-ui): Live MCP text and structured results agree on exact NVDA representations, market evidence, timestamps, provenance, warnings and no-side-effect behavior. Evidence: Two post-reconnect read-only calls returned two BNB NVDA representations. Parsed text exactly equaled structuredContent, including per-asset market data, timestamps and source endpoints; unknown market status and missing liquidity remained explicit; sideEffects was none.
  - local-regression-and-scope (typecheck, build, test:demo-mode, test:core-product-phase-plan): The App runtime, Demo safety, build and approved Phase 12-13 scope checks pass without website, wallet or execution changes. Evidence: Typecheck/build pass; the bundled App host harness covers structured/text-only results and interaction; Demo checks cover natural-language resolution, ambiguity and action rejection; plan checks retain the Phase 12-13 boundary. No website, wallet, signing, broadcast, deployment or publication was changed or used.
  - phase-status-transition (test:jev-shadow, test:core-product-phase-plan): The phase ledger advances from mcp-agent-host-rendering-parity to delivery-complete only after all checks pass, all criteria are met at confidence at least 0.85 and Jev returns low-risk continue at at least 0.85; a failed check or paused review keeps Phase 13 active. Evidence: A deterministic state-machine regression simulates the named transition after complete approval and asserts a failed check holds the current phase even when a mock reviewer says continue. Existing Jev regressions cover incomplete criteria and confidence below the unchanged 0.85 floor.
- Jev confidence by review item: status=0.530, nextAction=0.820, riskLevel=1.000, criterion_host-rendering=0.730, criterion_live-data-parity=0.710, criterion_local-regression-and-scope=0.900, criterion_phase-status-transition=0.520
- Jev criterion findings: Criterion host-rendering: met (0.730 confidence) — The user confirms the research card is visible in this Agent conversation, and the actual bundled MCP Apps client completes the handshake and renders host-delivered research without wallet or trading controls.; Criterion live-data-parity: met (0.710 confidence) — Live MCP text and structured results agree on exact NVDA representations, market evidence, timestamps, provenance, warnings and no-side-effect behavior.; Criterion local-regression-and-scope: met (0.900 confidence) — The App runtime, Demo safety, build and approved Phase 12-13 scope checks pass without website, wallet or execution changes.; Criterion phase-status-transition: met (0.520 confidence) — The phase ledger advances from mcp-agent-host-rendering-parity to delivery-complete only after all checks pass, all criteria are met at confidence at least 0.85 and Jev returns low-risk continue at at least 0.85; a failed check or paused review keeps Phase 13 active.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T06:15:09.682Z
- Phase: `mcp-agent-host-rendering-parity`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.180`
- Agreement: `true`
- Latency: `1412 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion live-data-parity: gap — Live MCP text and structured results agree on exact NVDA representations, market evidence, timestamps, provenance, warnings and no-side-effect behavior.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - host-rendering (test:mcp-app-ui, test:core-product-phase-plan): The user confirms the research card is visible in this Agent conversation, and the bundled MCP Apps client renders the host-delivered research result without wallet or trading controls. Evidence: The user directly reports actual card visibility in this conversation. Separately, test:mcp-app-ui executes the exact inline bundle in a deterministic MCP Apps protocol-host harness: initialization completes, host-delivered structured and text-only tool results render, output matches the expected view, view switching works, and wallet/trading affordances are absent. This is runtime protocol evidence, not screenshot evidence.
  - live-data-parity (test:mcp-app-ui): Live MCP text and structured results agree on exact NVDA representations, market evidence, timestamps, provenance, warnings and no-side-effect behavior. Evidence: Two post-reconnect read-only MCP calls returned two BNB NVDA representations. Parsed text exactly matched structuredContent, including exact issuer identities, per-asset price/timestamps and source endpoints; unknown market status and missing liquidity warnings remained explicit; sideEffects was none.
  - local-regression-and-scope (typecheck, build, test:demo-mode, test:core-product-phase-plan, test:jev-shadow): All selected Phase 13 local checks pass, including App runtime, Demo safety, exact phase-plan scope, terminal-state transition and failed-check hold behavior; no website, wallet or execution surface is changed. Evidence: All five linked checks pass. test:mcp-app-ui additionally passes the bundled host-runtime flow; test:jev-shadow directly verifies an approved Phase 13 transition to delivery-complete and proves failed checks keep the phase active even if a mock reviewer says continue. No wallet, signature, broadcast, deployment or publication was used.
- Jev confidence by review item: status=0.640, nextAction=0.730, riskLevel=0.990, criterion_host-rendering=0.840, criterion_live-data-parity=0.180, criterion_local-regression-and-scope=0.930
- Jev criterion findings: Criterion host-rendering: met (0.840 confidence) — The user confirms the research card is visible in this Agent conversation, and the bundled MCP Apps client renders the host-delivered research result without wallet or trading controls.; Criterion live-data-parity: gap (0.180 confidence) — Live MCP text and structured results agree on exact NVDA representations, market evidence, timestamps, provenance, warnings and no-side-effect behavior.; Criterion local-regression-and-scope: met (0.930 confidence) — All selected Phase 13 local checks pass, including App runtime, Demo safety, exact phase-plan scope, terminal-state transition and failed-check hold behavior; no website, wallet or execution surface is changed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T06:23:18.913Z
- Phase: `mcp-agent-host-rendering-parity`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.650`
- Agreement: `true`
- Latency: `1155 ms`
- Phase transition: `pause`
- Transition reason: Criterion host-rendering lacks a sufficiently confident Jev review (0.830); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - host-rendering (test:mcp-app-ui): The user confirms the research card is visible, and the bundled MCP App renders host-delivered structured and text-only results. Evidence: The user confirmed visibility in this conversation; the simulated protocol-host test executes the app bundle and renders both result forms.
  - live-data-parity (test:mcp-natural-language): Live SDK and MCP research/discovery preserve exact NVDA identities, text and structured parity, timestamped provenance and no-side-effect behavior. Evidence: The live integration asserts SDK/MCP identity parity and exact parsed-text/structuredContent equality for research and discovery, with times, sources and sideEffects none.
  - local-regression-and-scope (typecheck, build, test:demo-mode, test:core-product-phase-plan, test:jev-shadow): Selected local, runtime and phase-ledger checks pass without changing website, wallet or execution scope. Evidence: Selected checks cover types/build, read-only safety, approved scope and phase transition/hold behavior; no website or transaction path is in scope.
- Jev confidence by review item: status=0.920, nextAction=0.970, riskLevel=1.000, criterion_host-rendering=0.830, criterion_live-data-parity=0.900, criterion_local-regression-and-scope=0.650, deferredScope=1.000
- Jev criterion findings: Criterion host-rendering: met (0.830 confidence) — The user confirms the research card is visible, and the bundled MCP App renders host-delivered structured and text-only results.; Criterion live-data-parity: met (0.900 confidence) — Live SDK and MCP research/discovery preserve exact NVDA identities, text and structured parity, timestamped provenance and no-side-effect behavior.; Criterion local-regression-and-scope: met (0.650 confidence) — Selected local, runtime and phase-ledger checks pass without changing website, wallet or execution scope.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T06:29:16.994Z
- Phase: `mcp-agent-host-rendering-parity`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.850`
- Agreement: `true`
- Latency: `771 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - host-rendering (test:mcp-app-ui, test:mcp-natural-language): The user confirms the card is visible; live MCP tools link its native UI resource and the app bundle renders structured and text host results. Evidence: The user confirmed visibility; live tool metadata links discovery/research to one served ui:// resource, and the bundle test renders both host-delivered result forms.
  - live-data-parity (test:mcp-natural-language): Live SDK and MCP research/discovery preserve exact NVDA identities, text and structured parity, timestamped provenance and no-side-effect behavior. Evidence: The live integration asserts SDK/MCP identity parity and exact parsed-text/structuredContent equality for research and discovery, with times, sources and sideEffects none.
  - local-regression (typecheck, build, test:demo-mode, test:core-product-phase-plan, test:jev-shadow): Selected compile/build, no-trade safety, phase-plan and phase-gate state regression checks pass. Evidence: Each linked check exits successfully; outputs cover compile/build, read-only behavior, approved phase-plan consistency, and terminal advance versus failed-check hold.
- Jev confidence by review item: status=0.930, nextAction=0.980, riskLevel=1.000, criterion_host-rendering=0.960, criterion_live-data-parity=0.850, criterion_local-regression=0.900, deferredScope=1.000
- Jev criterion findings: Criterion host-rendering: met (0.960 confidence) — The user confirms the card is visible; live MCP tools link its native UI resource and the app bundle renders structured and text host results.; Criterion live-data-parity: met (0.850 confidence) — Live SDK and MCP research/discovery preserve exact NVDA identities, text and structured parity, timestamped provenance and no-side-effect behavior.; Criterion local-regression: met (0.900 confidence) — Selected compile/build, no-trade safety, phase-plan and phase-gate state regression checks pass.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T07:02:47.902Z
- Phase: `mcp-research-observability`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.580`
- Agreement: `true`
- Latency: `941 ms`
- Phase transition: `pause`
- Transition reason: Criterion research-timing lacks a sufficiently confident Jev review (0.580); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - research-timing (test:asset-intent-query, test:demo-mode, test:mcp-natural-language): Research results report finite stage timings and bounded service-method invocation counts, distinguishing direct search, catalog resolution, resolved search, market context, comparison, and presentation without changing no-trade behavior. Evidence: Deterministic tests verify direct ticker lookup skips catalog loading and natural-language resolution counts its catalog and follow-up calls. The live read-only MCP test checks finite stage timings while preserving SDK/MCP identity parity, text/structured parity, and sideEffects none.
  - safe-failure-diagnosis (test:mcp-enrichment, test:presentation, test:mcp-app-ui): Market-context failures remain fail-closed with asset identity preserved, are classified into sanitized network/provider/data-integrity/unexpected categories, and never expose raw exception text. Evidence: Synthetic network/provider errors and mismatched batches keep identities but omit market values; safe categories and user-readable warnings are asserted, raw exception strings are absent, and the native research view renders the sanitized warning.
  - scope-and-regression (typecheck, build, test:demo-mode, test:mcp-app-ui, test:core-product-phase-plan, test:jev-shadow): Core type/build, demo behavior, app-view safety, approved phase plan and gate transition regressions pass without website, wallet, signature, broadcast, release, or deployment work. Evidence: Selected checks verify core compilation, no-trade Demo behavior, read-only app rendering, current approved phase scope, and gate advance/hold logic. The live acceptance used read-only research only; no website files or transaction path were in this phase.
- Jev confidence by review item: status=0.980, nextAction=0.980, riskLevel=1.000, criterion_research-timing=0.580, criterion_safe-failure-diagnosis=0.980, criterion_scope-and-regression=0.910
- Jev criterion findings: Criterion research-timing: met (0.580 confidence) — Research results report finite stage timings and bounded service-method invocation counts, distinguishing direct search, catalog resolution, resolved search, market context, comparison, and presentation without changing no-trade behavior.; Criterion safe-failure-diagnosis: met (0.980 confidence) — Market-context failures remain fail-closed with asset identity preserved, are classified into sanitized network/provider/data-integrity/unexpected categories, and never expose raw exception text.; Criterion scope-and-regression: met (0.910 confidence) — Core type/build, demo behavior, app-view safety, approved phase plan and gate transition regressions pass without website, wallet, signature, broadcast, release, or deployment work.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T07:10:14.224Z
- Phase: `mcp-research-observability`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.820`
- Agreement: `true`
- Latency: `795 ms`
- Phase transition: `pause`
- Transition reason: Criterion scope-and-regression lacks a sufficiently confident Jev review (0.820); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - research-timing (test:asset-intent-query, test:demo-mode, test:mcp-natural-language): For direct ticker and natural-language MCP research, expose finite nonnegative resolver and handler timings whose resolver substages fit inside searchMs and whose sequential measured stages fit inside totalMs; report exact service-method call counts and one market-context batch while preserving read-only behavior. Evidence: Deterministic Demo and live MCP tests assert direct ticker calls are directSearch=1/catalogRead=0/resolvedSearch=0, natural-language fallback reports its exact call matrix, all measured durations are finite/nonnegative, resolver substages sum to no more than searchMs, sequential stages sum to no more than totalMs, and the two-asset live research uses one market-context batch with sideEffects none.
  - safe-failure-diagnosis (test:mcp-enrichment, test:presentation, test:mcp-app-ui): Market-context failures preserve asset identity, omit unverified market values, use sanitized network/provider/integrity/unexpected categories, and never expose raw exception text in structured or rendered output. Evidence: Synthetic network, provider, mismatched-batch and unexpected failures assert identity-only fail-closed results, exact safe categories and warnings, absence of raw error text, and rendering of the sanitized warning in the native MCP research view.
  - scope-and-regression (typecheck, build, test:demo-mode, test:mcp-app-ui, test:core-product-phase-plan, test:jev-shadow): The Phase 14 implementation and phase ledger compile, build, retain no-trade behavior and correctly hold or advance only within the approved MCP observability phase; no website or execution surface is altered. Evidence: Selected checks cover TypeScript/build, no-trade Demo behavior, read-only MCP App rendering, the approved Phase 14 boundary, and state-machine regressions for same-phase hold, a newly paused phase after a terminal ledger, and advancement only after approval.
- Jev confidence by review item: status=0.950, nextAction=0.990, riskLevel=1.000, criterion_research-timing=0.980, criterion_safe-failure-diagnosis=0.980, criterion_scope-and-regression=0.820
- Jev criterion findings: Criterion research-timing: met (0.980 confidence) — For direct ticker and natural-language MCP research, expose finite nonnegative resolver and handler timings whose resolver substages fit inside searchMs and whose sequential measured stages fit inside totalMs; report exact service-method call counts and one market-context batch while preserving read-only behavior.; Criterion safe-failure-diagnosis: met (0.980 confidence) — Market-context failures preserve asset identity, omit unverified market values, use sanitized network/provider/integrity/unexpected categories, and never expose raw exception text in structured or rendered output.; Criterion scope-and-regression: met (0.820 confidence) — The Phase 14 implementation and phase ledger compile, build, retain no-trade behavior and correctly hold or advance only within the approved MCP observability phase; no website or execution surface is altered.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T07:12:40.869Z
- Phase: `mcp-research-observability`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.890`
- Agreement: `true`
- Latency: `878 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - research-timing (test:asset-intent-query, test:demo-mode, test:mcp-natural-language): For direct ticker and natural-language MCP research, expose finite nonnegative resolver and handler timings whose resolver substages fit inside searchMs and whose sequential measured stages fit inside totalMs; report exact service-method call counts and one market-context batch while preserving read-only behavior. Evidence: Deterministic Demo and live MCP tests assert direct ticker calls are directSearch=1/catalogRead=0/resolvedSearch=0, natural-language fallback reports its exact call matrix, all measured durations are finite/nonnegative, resolver substages sum to no more than searchMs, sequential stages sum to no more than totalMs, and the two-asset live research uses one market-context batch with sideEffects none.
  - safe-failure-diagnosis (test:mcp-enrichment, test:presentation, test:mcp-app-ui): Market-context failures preserve asset identity, omit unverified market values, use sanitized network/provider/integrity/unexpected categories, and never expose raw exception text in structured or rendered output. Evidence: Synthetic network, provider, mismatched-batch and unexpected failures assert identity-only fail-closed results, exact safe categories and warnings, absence of raw error text, and rendering of the sanitized warning in the native MCP research view.
  - scope-and-regression (typecheck, build, test:demo-mode, test:mcp-app-ui, test:core-product-phase-plan, test:jev-shadow): Phase 14 remains the active held phase until an approved gate advances it; selected core checks pass, no-trade MCP research stays read-only, and the state-machine regression holds on pause and advances only after approval. Evidence: Typecheck/build pass; Demo and MCP App tests assert read-only/no-trade behavior; the phase-plan test checks the persisted currentPhase=mcp-research-observability and paused nextPhase=delivery-complete; Jev-state regression proves both pause holds and approved transition advances.
- Jev confidence by review item: status=0.960, nextAction=0.890, riskLevel=1.000, criterion_research-timing=0.980, criterion_safe-failure-diagnosis=0.980, criterion_scope-and-regression=0.890
- Jev criterion findings: Criterion research-timing: met (0.980 confidence) — For direct ticker and natural-language MCP research, expose finite nonnegative resolver and handler timings whose resolver substages fit inside searchMs and whose sequential measured stages fit inside totalMs; report exact service-method call counts and one market-context batch while preserving read-only behavior.; Criterion safe-failure-diagnosis: met (0.980 confidence) — Market-context failures preserve asset identity, omit unverified market values, use sanitized network/provider/integrity/unexpected categories, and never expose raw exception text in structured or rendered output.; Criterion scope-and-regression: met (0.890 confidence) — Phase 14 remains the active held phase until an approved gate advances it; selected core checks pass, no-trade MCP research stays read-only, and the state-machine regression holds on pause and advances only after approval.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T19:21:45.238Z
- Phase: `mcp-post-simulation-user-confirmation`
- Jev provider: `deterministic-fallback`
- Baseline: `passed` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `14 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - mcp-host-approval (test:mcp-human-confirmation, test:plan-registry): Only an accepted MCP form-elicitation response with decision=approve advances an unchanged, registered simulated plan; decline, cancel, unsupported host, malformed reply, or changed plan does not advance it. Evidence: A protocol-level in-memory MCP host exercises the production confirmation tool; deterministic assertions inspect the requested exact plan details and verify every non-approval path retains the simulated registry stage.
  - sdk-approval-responsibility (typecheck, test:guarded-sdk-executor, test:execution-dry-run): SDK confirmation no longer treats planId as a token; standalone SDK applications must collect user approval in their own UI before confirm(plan). Evidence: The SDK executor and offline synthetic rehearsal compile and run using confirm(plan) without a planId credential; SDK usage documentation assigns user approval to the integrating application.
  - no-signing-or-broadcast (test:mcp-human-confirmation, test:guarded-sdk-executor, test:execution-dry-run): The new MCP approval prompt and state transition do not sign or broadcast, and the existing downstream transaction guards continue to pass. Evidence: The MCP host protocol test records zero broadcast requests and no real wallet; the offline regression retains explicit separate signing checks and records zero broadcasts.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T19:22:26.951Z
- Phase: `mcp-post-simulation-user-confirmation`
- Jev provider: `native-jev`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: `needs_rework` / `repair` / risk `medium` / confidence `0.400`
- Agreement: `true`
- Latency: `1647 ms`
- Phase transition: `pause`
- Transition reason: Criterion sdk-approval-responsibility lacks a sufficiently confident Jev review (0.830); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - mcp-host-approval (test:mcp-human-confirmation, test:plan-registry): Only an accepted MCP form-elicitation response with decision=approve advances an unchanged, registered simulated plan; decline, cancel, unsupported host, malformed reply, or changed plan does not advance it. Evidence: A protocol-level in-memory MCP host exercises the production confirmation tool; deterministic assertions inspect the requested exact plan details and verify every non-approval path retains the simulated registry stage.
  - sdk-approval-responsibility (typecheck, test:guarded-sdk-executor, test:execution-dry-run): SDK confirmation no longer treats planId as a token; standalone SDK applications must collect user approval in their own UI before confirm(plan). Evidence: The SDK executor and offline synthetic rehearsal compile and run using confirm(plan) without a planId credential; SDK usage documentation assigns user approval to the integrating application.
  - no-signing-or-broadcast (test:mcp-human-confirmation, test:guarded-sdk-executor, test:execution-dry-run): The new MCP approval prompt and state transition do not sign or broadcast, and the existing downstream transaction guards continue to pass. Evidence: The MCP host protocol test records zero broadcast requests and no real wallet; the offline regression retains explicit separate signing checks and records zero broadcasts.
- Jev confidence by review item: status=0.860, nextAction=0.940, riskLevel=0.400, criterion_mcp-host-approval=0.960, criterion_sdk-approval-responsibility=0.830, criterion_no-signing-or-broadcast=0.940
- Jev criterion findings: Criterion mcp-host-approval: met (0.960 confidence) — Only an accepted MCP form-elicitation response with decision=approve advances an unchanged, registered simulated plan; decline, cancel, unsupported host, malformed reply, or changed plan does not advance it.; Criterion sdk-approval-responsibility: met (0.830 confidence) — SDK confirmation no longer treats planId as a token; standalone SDK applications must collect user approval in their own UI before confirm(plan).; Criterion no-signing-or-broadcast: met (0.940 confidence) — The new MCP approval prompt and state transition do not sign or broadcast, and the existing downstream transaction guards continue to pass.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T19:27:43.837Z
- Phase: `mcp-post-simulation-user-confirmation`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.790`
- Agreement: `true`
- Latency: `1029 ms`
- Phase transition: `pause`
- Transition reason: Criterion mcp-host-approval lacks a sufficiently confident Jev review (0.790); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - mcp-host-approval (test:mcp-human-confirmation, test:plan-registry): Only an accepted MCP form-elicitation response with decision=approve advances an unchanged, registered simulated plan; decline, cancel, unsupported host, malformed reply, or changed plan does not advance it. Evidence: An in-memory MCP host invokes the same production tool registration as the server. Tests inspect the exact summary/form schema and registered stage after approve, decline, cancel, SDK-rejected malformed content, unsupported elicitation, and changed plans.
  - sdk-approval-responsibility (typecheck, test:mcp-human-confirmation, test:guarded-sdk-executor, test:execution-dry-run): SDK confirmation has no planId-as-token API; the integrating application is explicitly responsible for collecting user approval before confirm(plan), and docs state the host/caller limitation. Evidence: Typecheck and synthetic executor callers compile with confirm(plan) and no token. The MCP confirmation regression also asserts SDK_USAGE documents the app-owned approval UI, says SDK cannot prove a person approved, and no longer claims planId is an authentication token.
  - separate-signing-boundary (test:mcp-human-confirmation, test:guarded-sdk-executor, test:execution-dry-run, test:demo-mode): This change requests no external signature or broadcast; all post-confirmation signing and transaction guards remain separate and regression-tested. Evidence: The protocol host test confirms local state only, zero broadcasts, and no real wallet. Existing synthetic signing tests remain isolated fixtures and record zero network broadcasts; Demo mode blocks action preparation.
- Jev confidence by review item: status=0.980, nextAction=0.980, riskLevel=0.990, criterion_mcp-host-approval=0.790, criterion_sdk-approval-responsibility=0.960, criterion_separate-signing-boundary=0.960
- Jev criterion findings: Criterion mcp-host-approval: met (0.790 confidence) — Only an accepted MCP form-elicitation response with decision=approve advances an unchanged, registered simulated plan; decline, cancel, unsupported host, malformed reply, or changed plan does not advance it.; Criterion sdk-approval-responsibility: met (0.960 confidence) — SDK confirmation has no planId-as-token API; the integrating application is explicitly responsible for collecting user approval before confirm(plan), and docs state the host/caller limitation.; Criterion separate-signing-boundary: met (0.960 confidence) — This change requests no external signature or broadcast; all post-confirmation signing and transaction guards remain separate and regression-tested.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T19:29:38.353Z
- Phase: `mcp-post-simulation-user-confirmation`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.950`
- Agreement: `true`
- Latency: `907 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - mcp-host-approval (test:mcp-human-confirmation, test:plan-registry): The MCP tool ignores an Agent-echoed planId and still requests host elicitation. Only accepted decision=approve advances the exact registered simulated plan; decline, cancel, malformed/unavailable host, or altered plan does not. This verifies the trusted-host response boundary, not proof of a human click. Evidence: An in-memory MCP host calls the production tool registration. Tests confirm the public schema exposes only plan, a forged echoed confirmationToken still invokes elicitation, exact plan details are shown, accepted approval advances once, and all non-approval or changed-plan paths remain simulated.
  - sdk-approval-responsibility (typecheck, test:mcp-human-confirmation, test:guarded-sdk-executor, test:execution-dry-run): SDK confirmation has no planId-as-token API; the integrating application must collect user approval before confirm(plan), and docs state the host/caller limitation. Evidence: Typecheck and synthetic executor callers compile with confirm(plan) and no token. The MCP confirmation regression asserts SDK_USAGE documents app-owned approval UI, says SDK cannot prove a person approved, and no longer calls planId an authentication token.
  - separate-signing-boundary (test:mcp-human-confirmation, test:guarded-sdk-executor, test:execution-dry-run, test:demo-mode): This change requests no external signature or broadcast; post-confirmation signing and transaction guards remain separate and regression-tested. Evidence: The protocol host test confirms local state only, zero broadcasts, and no real wallet. Existing synthetic signer tests remain isolated fixtures and record zero network broadcasts; Demo mode blocks action preparation.
- Jev confidence by review item: status=0.970, nextAction=0.980, riskLevel=0.990, criterion_mcp-host-approval=0.950, criterion_sdk-approval-responsibility=0.970, criterion_separate-signing-boundary=0.980
- Jev criterion findings: Criterion mcp-host-approval: met (0.950 confidence) — The MCP tool ignores an Agent-echoed planId and still requests host elicitation. Only accepted decision=approve advances the exact registered simulated plan; decline, cancel, malformed/unavailable host, or altered plan does not. This verifies the trusted-host response boundary, not proof of a human click.; Criterion sdk-approval-responsibility: met (0.970 confidence) — SDK confirmation has no planId-as-token API; the integrating application must collect user approval before confirm(plan), and docs state the host/caller limitation.; Criterion separate-signing-boundary: met (0.980 confidence) — This change requests no external signature or broadcast; post-confirmation signing and transaction guards remain separate and regression-tested.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

## 2026-10-01 — Core-product quality audit (Phase 16; complete, Jev 0.910)

The web/landing experience is excluded. This review covers only independent SDK use, Agent-facing MCP, the MCP-native read-only research view, and the guarded transaction workflow.

| Journey / quality area | Verified now | Gap, cause and next step |
|---|---|---|
| Standalone SDK developer | Typecheck/build and the package distribution check pass; prior clean-room import/type evidence is recorded historically. | Today's clean-room install did not finish because dependency resolution stayed silent, so current clean-room evidence is inconclusive. Re-run once package dependencies are available locally or network access is restored; do not describe today's attempt as passing. |
| Natural-language MCP user | A connected read-only Chinese request correctly resolved NVDA, returned two issuer representations, source endpoints, per-asset timestamps, warnings and `sideEffects: none`; the handler reported 3.56 seconds for this one sample. | The prose result was English despite a Chinese prompt; localization behavior is not currently an acceptance criterion. Decide whether Ariadne or the caller Agent owns response-language matching, then test both languages. One successful request does not establish broad Agent quality or an SLO. |
| Native MCP research UI | The MCP Apps research view is implemented and the user previously confirmed it was visible in this Codex conversation; local bundle tests cover text/structured results and interactions. | This UI is read-only research, not a wallet or trading panel. The newer transaction confirmation elicitation is covered by an in-memory protocol test only. The connected tool still advertises the old token-based input, so actual rendering of the new form is not verified. |
| Research interpretation | Missing liquidity and unknown bStocks market status were explicitly surfaced; exact identities and quote/source timestamps were present. | “Eligible” was misleading because the default empty filter object marks all returned rows as not excluded. Root cause was presentation wording, not market-data eligibility. Local output now says “Matches filters” or “No filters applied,” gives the price-gap rank basis, and disclaims tradability. |
| Transaction/business closure | Local state machine and synthetic signing/broadcast guards passed; the dry run reports nine rejected unsafe/replayed cases, zero broadcasts and no real wallet. | This is not funded execution or a complete settlement loop. Real RFQ signature, funded broadcast and post-trade balance reconciliation remain deferred; the safe path ends before those externally authorized steps. |
| Asset-data ecosystem | BNB inventory, provider timestamps and issuer representations have been measured and recorded. | Provider contract/observations still do not establish complete inventory: 538 metadata rows vs 488 token rows, equal observed `tabId` result sets, absent directory quote timestamps and some unknown fields. The source documents lack pagination/total-count support; preserve as upstream limitations until exact causes can be established. |

### Phase 16 verification record

- Passed locally: `typecheck`, `build`, `test:domain`, `test:plan-registry`, `test:mcp-human-confirmation`, `test:guarded-sdk-executor`, `test:execution-dry-run`, `test:mcp-app-ui`, `test:demo-mode`, `test:distribution`, `test:presentation`, `test:core-product-phase-plan`, and `git diff --check`.
- Live/API boundary: one connected MCP research call passed with `sideEffects: none`; the separate local live acceptance script failed to connect upstream (`NETWORK_TIMEOUT`). This is an environment-limited run, not a product assertion failure or a pass.
- SDK boundary: the clean-room package installation did not complete and was stopped; classify as inconclusive.
- Release/transaction boundary: no website work, real wallet, signature, broadcast, funded settlement, package publication or push.
- Final phase gate: all 7 selected checks passed and all 5 criteria were `met`; native Jev returned `passed_with_deferred_items` / low risk / confidence 0.910, and the ledger advanced to terminal `delivery-complete`. Here `continue` means final report and stop—not another coding phase. The deferred host-schema discrepancy, inconclusive clean-room attempt, live-network timeout and product follow-up decisions remain visible rather than being counted as completed functionality.

### Jev phase-gate record — 2026-09-30T20:14:55.012Z
- Phase: `core-product-quality-audit`
- Jev provider: `deterministic-fallback`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `25 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - comparison-language (test:presentation, test:core-product-phase-plan): MCP comparison output distinguishes filter matching from execution eligibility, makes the empty-filter case explicit, and identifies its rank as price-gap based. Evidence: Presentation regressions exercise filtered and unfiltered output, reject the old Eligible wording, and assert the price-gap rank and no-tradability disclaimer; phase-plan checks ensure the correction and its scope are recorded.
  - mcp-native-ui-and-confirmation (test:mcp-app-ui, test:mcp-human-confirmation, test:core-product-phase-plan): The audit accurately distinguishes the user-confirmed read-only research card from the locally tested but actual-host-unverified Phase 15 confirmation elicitation. Evidence: The MCP Apps bundle renders structured/text results and interactions; an in-memory host exercises production confirmation registration and fail-closed decisions; report assertions preserve the connected tool's older schema as a host-validation limitation.
  - safe-transaction-boundary (test:mcp-human-confirmation, test:execution-dry-run, build): The revised confirmation and quality audit do not sign or broadcast, and synthetic execution regressions retain their safety checks. Evidence: The protocol test and offline execution rehearsal report zero broadcast requests and no real wallet; the build succeeds. These checks do not claim funded settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T20:15:45.556Z
- Phase: `core-product-quality-audit`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `repair` / risk `low` / confidence `0.550`
- Agreement: `false`
- Latency: `1552 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion mcp-native-ui-and-confirmation: insufficient_evidence — The audit accurately distinguishes the user-confirmed read-only research card from the locally tested but actual-host-unverified Phase 15 confirmation elicitation.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - comparison-language (test:presentation, test:core-product-phase-plan): MCP comparison output distinguishes filter matching from execution eligibility, makes the empty-filter case explicit, and identifies its rank as price-gap based. Evidence: Presentation regressions exercise filtered and unfiltered output, reject the old Eligible wording, and assert the price-gap rank and no-tradability disclaimer; phase-plan checks ensure the correction and its scope are recorded.
  - mcp-native-ui-and-confirmation (test:mcp-app-ui, test:mcp-human-confirmation, test:core-product-phase-plan): The audit accurately distinguishes the user-confirmed read-only research card from the locally tested but actual-host-unverified Phase 15 confirmation elicitation. Evidence: The MCP Apps bundle renders structured/text results and interactions; an in-memory host exercises production confirmation registration and fail-closed decisions; report assertions preserve the connected tool's older schema as a host-validation limitation.
  - safe-transaction-boundary (test:mcp-human-confirmation, test:execution-dry-run, build): The revised confirmation and quality audit do not sign or broadcast, and synthetic execution regressions retain their safety checks. Evidence: The protocol test and offline execution rehearsal report zero broadcast requests and no real wallet; the build succeeds. These checks do not claim funded settlement.
- Jev confidence by review item: status=0.970, nextAction=0.610, riskLevel=0.620, criterion_comparison-language=0.880, criterion_mcp-native-ui-and-confirmation=0.550, criterion_safe-transaction-boundary=0.790, deferredScope=0.640
- Jev criterion findings: Criterion comparison-language: met (0.880 confidence) — MCP comparison output distinguishes filter matching from execution eligibility, makes the empty-filter case explicit, and identifies its rank as price-gap based.; Criterion mcp-native-ui-and-confirmation: insufficient_evidence (0.550 confidence) — The audit accurately distinguishes the user-confirmed read-only research card from the locally tested but actual-host-unverified Phase 15 confirmation elicitation.; Criterion safe-transaction-boundary: met (0.790 confidence) — The revised confirmation and quality audit do not sign or broadcast, and synthetic execution regressions retain their safety checks.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T20:18:00.442Z
- Phase: `core-product-quality-audit`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.620`
- Agreement: `true`
- Latency: `920 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the minimum threshold (0.85); the least-certain review item is nextAction (0.620). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - comparison-language (test:presentation, test:core-product-phase-plan): MCP comparison output distinguishes filter matching from execution eligibility, makes the empty-filter case explicit, and identifies its rank as price-gap based. Evidence: Presentation regressions cover explicit filters and an empty filter object, reject the old Eligible wording, and assert the price-gap ranking and no-tradability disclaimer; phase-plan checks verify its recorded scope.
  - research-ui-contract (test:mcp-app-ui, test:core-product-phase-plan): The local MCP Apps research view renders the bundled result with structured and text-only delivery and preserves the research-only boundary. Evidence: The bundled client handshake, structured/text-only host notifications, rendered values, interaction, hostile-data escaping and no-trade boundary pass. The user separately confirmed the card was visible in this Codex conversation; the report attributes that as a user observation, not a Codex screenshot.
  - confirmation-protocol (test:mcp-human-confirmation, test:execution-dry-run): The local production MCP confirmation handler requires an accepted explicit approve response for an unchanged simulated plan; every non-approval path remains simulated and does not sign or broadcast. Evidence: An in-memory MCP client exercises the production handler and verifies exact plan summary, approval, decline, cancel, malformed/unavailable host, changed plan, zero broadcasts and no real wallet; synthetic SDK rehearsal retains its separate signing checks.
  - host-version-disclosure (test:core-product-phase-plan, test:mcp-human-confirmation): The audit records that the connected MCP tool still exposes the old confirmationToken contract while local source exposes only plan, and explicitly does not claim actual-host rendering of the new elicitation. Evidence: Direct connected-tool metadata in this task showed confirmationToken plus plan; local production registration and protocol tests show only plan and host elicitation. The phase-plan test asserts the version discrepancy and the reports label new-form rendering unverified. This is disclosure of a limit, not a claim that the new form rendered.
  - safe-transaction-boundary (test:mcp-human-confirmation, test:execution-dry-run, build): The audit does not cross into real wallet signing, broadcast, or funded settlement. Evidence: The local confirmation test and offline synthetic rehearsal both report zero broadcasts and no real wallet; compilation succeeds. Funded settlement remains excluded.
- Jev confidence by review item: status=0.990, nextAction=0.620, riskLevel=0.780, criterion_comparison-language=0.980, criterion_research-ui-contract=0.950, criterion_confirmation-protocol=0.980, criterion_host-version-disclosure=0.960, criterion_safe-transaction-boundary=0.990, deferredScope=0.950
- Jev criterion findings: Criterion comparison-language: met (0.980 confidence) — MCP comparison output distinguishes filter matching from execution eligibility, makes the empty-filter case explicit, and identifies its rank as price-gap based.; Criterion research-ui-contract: met (0.950 confidence) — The local MCP Apps research view renders the bundled result with structured and text-only delivery and preserves the research-only boundary.; Criterion confirmation-protocol: met (0.980 confidence) — The local production MCP confirmation handler requires an accepted explicit approve response for an unchanged simulated plan; every non-approval path remains simulated and does not sign or broadcast.; Criterion host-version-disclosure: met (0.960 confidence) — The audit records that the connected MCP tool still exposes the old confirmationToken contract while local source exposes only plan, and explicitly does not claim actual-host rendering of the new elicitation.; Criterion safe-transaction-boundary: met (0.990 confidence) — The audit does not cross into real wallet signing, broadcast, or funded settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T20:19:19.699Z
- Phase: `core-product-quality-audit`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.270`
- Agreement: `true`
- Latency: `802 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the minimum threshold (0.85); the least-certain review item is nextAction (0.270). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - comparison-language (test:presentation, test:core-product-phase-plan): MCP comparison output distinguishes filter matching from execution eligibility, makes the empty-filter case explicit, and identifies its rank as price-gap based. Evidence: Presentation regressions cover explicit filters and an empty filter object, reject the old Eligible wording, and assert the price-gap ranking and no-tradability disclaimer; phase-plan checks verify its recorded scope.
  - research-ui-contract (test:mcp-app-ui, test:core-product-phase-plan): The local MCP Apps research view renders the bundled result with structured and text-only delivery and preserves the research-only boundary. Evidence: The bundled client handshake, structured/text-only host notifications, rendered values, interaction, hostile-data escaping and no-trade boundary pass. The user separately confirmed the card was visible in this Codex conversation; the report attributes that as a user observation, not a Codex screenshot.
  - confirmation-protocol (test:mcp-human-confirmation, test:execution-dry-run): The local production MCP confirmation handler requires an accepted explicit approve response for an unchanged simulated plan; every non-approval path remains simulated and does not sign or broadcast. Evidence: An in-memory MCP client exercises the production handler and verifies exact plan summary, approval, decline, cancel, malformed/unavailable host, changed plan, zero broadcasts and no real wallet; synthetic SDK rehearsal retains its separate signing checks.
  - host-version-disclosure (test:core-product-phase-plan, test:mcp-human-confirmation): The audit records that the connected MCP tool still exposes the old confirmationToken contract while local source exposes only plan, and explicitly does not claim actual-host rendering of the new elicitation. Evidence: Direct connected-tool metadata in this task showed confirmationToken plus plan; local production registration and protocol tests show only plan and host elicitation. The phase-plan test asserts the version discrepancy and reports label new-form rendering unverified. This is disclosure of a limit, not a claim that the new form rendered.
  - safe-transaction-boundary (test:mcp-human-confirmation, test:execution-dry-run, build): The audit does not cross into real wallet signing, broadcast, or funded settlement. Evidence: The local confirmation test and offline synthetic rehearsal both report zero broadcasts and no real wallet; compilation succeeds. Funded settlement remains excluded.
- Jev confidence by review item: status=0.990, nextAction=0.270, riskLevel=0.870, criterion_comparison-language=0.990, criterion_research-ui-contract=0.930, criterion_confirmation-protocol=0.990, criterion_host-version-disclosure=0.980, criterion_safe-transaction-boundary=1.000, deferredScope=0.970
- Jev criterion findings: Criterion comparison-language: met (0.990 confidence) — MCP comparison output distinguishes filter matching from execution eligibility, makes the empty-filter case explicit, and identifies its rank as price-gap based.; Criterion research-ui-contract: met (0.930 confidence) — The local MCP Apps research view renders the bundled result with structured and text-only delivery and preserves the research-only boundary.; Criterion confirmation-protocol: met (0.990 confidence) — The local production MCP confirmation handler requires an accepted explicit approve response for an unchanged simulated plan; every non-approval path remains simulated and does not sign or broadcast.; Criterion host-version-disclosure: met (0.980 confidence) — The audit records that the connected MCP tool still exposes the old confirmationToken contract while local source exposes only plan, and explicitly does not claim actual-host rendering of the new elicitation.; Criterion safe-transaction-boundary: met (1.000 confidence) — The audit does not cross into real wallet signing, broadcast, or funded settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T20:22:10.979Z
- Phase: `core-product-quality-audit`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.910`
- Agreement: `true`
- Latency: `933 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - comparison-language (test:presentation, test:core-product-phase-plan): MCP comparison output distinguishes filter matching from execution eligibility, makes the empty-filter case explicit, and identifies its rank as price-gap based. Evidence: Presentation regressions cover explicit filters and an empty filter object, reject the old Eligible wording, and assert the price-gap ranking and no-tradability disclaimer; phase-plan checks verify its recorded scope.
  - research-ui-contract (test:mcp-app-ui, test:core-product-phase-plan): The local MCP Apps research view renders the bundled result with structured and text-only delivery and preserves the research-only boundary. Evidence: The bundled client handshake, structured/text-only host notifications, rendered values, interaction, hostile-data escaping and no-trade boundary pass. The user separately confirmed the card was visible in this Codex conversation; the report attributes that as a user observation, not a Codex screenshot.
  - confirmation-protocol (test:mcp-human-confirmation, test:execution-dry-run): The local production MCP confirmation handler requires an accepted explicit approve response for an unchanged simulated plan; every non-approval path remains simulated and does not sign or broadcast. Evidence: An in-memory MCP client exercises the production handler and verifies exact plan summary, approval, decline, cancel, malformed/unavailable host, changed plan, zero broadcasts and no real wallet; synthetic SDK rehearsal retains its separate signing checks.
  - host-version-disclosure (test:core-product-phase-plan, test:mcp-human-confirmation): The audit records that the connected MCP tool still exposes the old confirmationToken contract while local source exposes only plan, and explicitly does not claim actual-host rendering of the new elicitation. Evidence: Direct connected-tool metadata in this task showed confirmationToken plus plan; local production registration and protocol tests show only plan and host elicitation. The phase-plan test asserts the version discrepancy and reports new-form rendering unverified. This is disclosure of a limit, not a claim that the new form rendered.
  - safe-transaction-boundary (test:mcp-human-confirmation, test:execution-dry-run, build): The audit does not cross into real wallet signing, broadcast, or funded settlement. Evidence: The local confirmation test and offline synthetic rehearsal both report zero broadcasts and no real wallet; compilation succeeds. Funded settlement remains excluded.
- Jev confidence by review item: status=0.990, nextAction=0.980, riskLevel=0.910, criterion_comparison-language=0.990, criterion_research-ui-contract=0.940, criterion_confirmation-protocol=0.990, criterion_host-version-disclosure=0.990, criterion_safe-transaction-boundary=1.000, deferredScope=0.990
- Jev criterion findings: Criterion comparison-language: met (0.990 confidence) — MCP comparison output distinguishes filter matching from execution eligibility, makes the empty-filter case explicit, and identifies its rank as price-gap based.; Criterion research-ui-contract: met (0.940 confidence) — The local MCP Apps research view renders the bundled result with structured and text-only delivery and preserves the research-only boundary.; Criterion confirmation-protocol: met (0.990 confidence) — The local production MCP confirmation handler requires an accepted explicit approve response for an unchanged simulated plan; every non-approval path remains simulated and does not sign or broadcast.; Criterion host-version-disclosure: met (0.990 confidence) — The audit records that the connected MCP tool still exposes the old confirmationToken contract while local source exposes only plan, and explicitly does not claim actual-host rendering of the new elicitation.; Criterion safe-transaction-boundary: met (1.000 confidence) — The audit does not cross into real wallet signing, broadcast, or funded settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T21:03:23.397Z
- Phase: `mcp-agent-native-research-ui`
- Jev provider: `deterministic-fallback`
- Baseline: `passed` / `continue` / risk `low`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `14 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - inline-host-native-ui (test:mcp-app-ui): The default MCP result is compact and inline, avoids a dashboard shell, adapts to supplied host theme/style/font and safe-area context with fallbacks, and keeps accessible responsive disclosures. Evidence: The protocol-host harness executes the bundled app, applies initial and changed host context, verifies compact non-dashboard HTML and responsive/theme fallback CSS, renders structured and text-only results, and retains overflow behind native details disclosures.
  - research-data-fidelity (test:mcp-app-ui, test:presentation): The redesigned view preserves exact returned asset identities, prices, timestamps, warnings, provenance, missing-field notes, links and text/structured compatibility without fabricating live-data claims. Evidence: UI assertions compare discovery/comparison/research identities and market values, render supplied per-asset timestamps and endpoint-field provenance, preserve caveats and missing fields, escape hostile strings, and keep presentation wording regressions passing.
  - safety-and-regression (test:demo-mode, typecheck, build, test:core-product-phase-plan): The Agent-native UI remains read-only and introduces no wallet, signature, trade or website behavior; relevant core regression and compile checks pass. Evidence: Demo regressions preserve ambiguity/action blocks and the forged-plan guard; typecheck/build and phase-ledger regression pass. The UI harness asserts no wallet/sign/trade affordances; Phase 17 scope excludes website and transaction behavior.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T21:04:11.589Z
- Phase: `mcp-agent-native-research-ui`
- Jev provider: `native-jev`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: `needs_rework` / `repair` / risk `low` / confidence `0.310`
- Agreement: `true`
- Latency: `2065 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion safety-and-regression: gap — The Agent-native UI remains read-only and introduces no wallet, signature, trade or website behavior; relevant core regression and compile checks pass.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - inline-host-native-ui (test:mcp-app-ui): The default MCP result is compact and inline, avoids a dashboard shell, adapts to supplied host theme/style/font and safe-area context with fallbacks, and keeps accessible responsive disclosures. Evidence: The protocol-host harness executes the bundled app, applies initial and changed host context, verifies compact non-dashboard HTML and responsive/theme fallback CSS, renders structured and text-only results, and retains overflow behind native details disclosures.
  - research-data-fidelity (test:mcp-app-ui, test:presentation): The redesigned view preserves exact returned asset identities, prices, timestamps, warnings, provenance, missing-field notes, links and text/structured compatibility without fabricating live-data claims. Evidence: UI assertions compare discovery/comparison/research identities and market values, render supplied per-asset timestamps and endpoint-field provenance, preserve caveats and missing fields, escape hostile strings, and keep presentation wording regressions passing.
  - safety-and-regression (test:demo-mode, typecheck, build, test:core-product-phase-plan): The Agent-native UI remains read-only and introduces no wallet, signature, trade or website behavior; relevant core regression and compile checks pass. Evidence: Demo regressions preserve ambiguity/action blocks and the forged-plan guard; typecheck/build and phase-ledger regression pass. The UI harness asserts no wallet/sign/trade affordances; Phase 17 scope excludes website and transaction behavior.
- Jev confidence by review item: status=0.920, nextAction=0.850, riskLevel=0.310, criterion_inline-host-native-ui=0.940, criterion_research-data-fidelity=0.960, criterion_safety-and-regression=0.510
- Jev criterion findings: Criterion inline-host-native-ui: met (0.940 confidence) — The default MCP result is compact and inline, avoids a dashboard shell, adapts to supplied host theme/style/font and safe-area context with fallbacks, and keeps accessible responsive disclosures.; Criterion research-data-fidelity: met (0.960 confidence) — The redesigned view preserves exact returned asset identities, prices, timestamps, warnings, provenance, missing-field notes, links and text/structured compatibility without fabricating live-data claims.; Criterion safety-and-regression: gap (0.510 confidence) — The Agent-native UI remains read-only and introduces no wallet, signature, trade or website behavior; relevant core regression and compile checks pass.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T21:05:42.357Z
- Phase: `mcp-agent-native-research-ui`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.770`
- Agreement: `true`
- Latency: `854 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the minimum threshold (0.85); the least-certain review item is status (0.770). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - inline-host-native-ui (test:mcp-app-ui): The default MCP result is compact and inline, avoids a dashboard shell, adapts to supplied host theme/style/font and safe-area context with fallbacks, and keeps accessible responsive disclosures. Evidence: The protocol-host harness executes the bundled app, applies initial and changed host context, verifies compact non-dashboard HTML and responsive/theme fallback CSS, renders structured and text-only results, and retains overflow behind native details disclosures.
  - research-data-fidelity (test:mcp-app-ui, test:presentation): The redesigned view preserves exact returned asset identities, prices, timestamps, warnings, provenance, missing-field notes, links and text/structured compatibility without fabricating live-data claims. Evidence: UI assertions compare discovery/comparison/research identities and market values, render supplied per-asset timestamps and endpoint-field provenance, preserve caveats and missing fields, escape hostile strings, and keep presentation wording regressions passing.
  - read-only-ui-safety (test:mcp-app-ui, test:demo-mode, typecheck, build, test:core-product-phase-plan): The rendered research result identifies itself as research-only and contains no wallet, signing or trade controls; Demo negative-action/forged-plan regressions and relevant compile/phase-ledger checks pass. Evidence: The MCP Apps harness asserts the research-only boundary and absence of form/private-key/sign/order controls; Demo-mode tests preserve action and forged-plan rejection; typecheck/build pass and the phase ledger records the bounded no-website scope and current Jev hold/advance reason.
- Jev confidence by review item: status=0.770, nextAction=0.870, riskLevel=0.990, criterion_inline-host-native-ui=0.960, criterion_research-data-fidelity=0.980, criterion_read-only-ui-safety=0.970
- Jev criterion findings: Criterion inline-host-native-ui: met (0.960 confidence) — The default MCP result is compact and inline, avoids a dashboard shell, adapts to supplied host theme/style/font and safe-area context with fallbacks, and keeps accessible responsive disclosures.; Criterion research-data-fidelity: met (0.980 confidence) — The redesigned view preserves exact returned asset identities, prices, timestamps, warnings, provenance, missing-field notes, links and text/structured compatibility without fabricating live-data claims.; Criterion read-only-ui-safety: met (0.970 confidence) — The rendered research result identifies itself as research-only and contains no wallet, signing or trade controls; Demo negative-action/forged-plan regressions and relevant compile/phase-ledger checks pass.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T21:09:30.054Z
- Phase: `mcp-agent-native-research-ui`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.250`
- Agreement: `true`
- Latency: `959 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the minimum threshold (0.85); the least-certain review item is nextAction (0.250). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - inline-host-native-ui (test:mcp-app-ui): The default MCP result is compact and inline, avoids a dashboard shell, adapts to supplied host theme/style/font and safe-area context with fallbacks, and keeps accessible responsive disclosures. Evidence: The protocol-host harness executes the bundled app, applies initial and changed host context, verifies compact non-dashboard HTML and responsive/theme fallback CSS, renders structured and text-only results, and retains overflow behind native details disclosures.
  - research-data-fidelity (test:mcp-app-ui, test:presentation): The redesigned view preserves exact returned asset identities, prices, timestamps, warnings, provenance, missing-field notes, links and text/structured compatibility without fabricating live-data claims. Evidence: UI assertions compare discovery/comparison/research identities and market values, render supplied per-asset timestamps and endpoint-field provenance, preserve caveats and missing fields, escape hostile strings, and keep presentation wording regressions passing.
  - read-only-ui-safety (test:mcp-app-ui, test:demo-mode, typecheck, build, test:core-product-phase-plan, test:jev-shadow): The rendered research result identifies itself as research-only and contains no wallet, signing or trade controls; Demo negative-action/forged-plan regressions and relevant compile, phase-ledger and gate-state checks pass. Evidence: The MCP Apps harness asserts the research-only boundary and absence of form/private-key/sign/order controls; Demo-mode tests preserve action and forged-plan rejection; test:jev-shadow proves this named Phase 17 advances only after passing checks and Jev criteria and stays active on a failed UI check; typecheck/build and ledger regression pass.
- Jev confidence by review item: status=0.980, nextAction=0.250, riskLevel=0.890, criterion_inline-host-native-ui=0.950, criterion_research-data-fidelity=0.980, criterion_read-only-ui-safety=0.970, deferredScope=0.880
- Jev criterion findings: Criterion inline-host-native-ui: met (0.950 confidence) — The default MCP result is compact and inline, avoids a dashboard shell, adapts to supplied host theme/style/font and safe-area context with fallbacks, and keeps accessible responsive disclosures.; Criterion research-data-fidelity: met (0.980 confidence) — The redesigned view preserves exact returned asset identities, prices, timestamps, warnings, provenance, missing-field notes, links and text/structured compatibility without fabricating live-data claims.; Criterion read-only-ui-safety: met (0.970 confidence) — The rendered research result identifies itself as research-only and contains no wallet, signing or trade controls; Demo negative-action/forged-plan regressions and relevant compile, phase-ledger and gate-state checks pass.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T21:14:14.972Z
- Phase: `mcp-agent-native-research-ui`
- Jev provider: `deterministic-fallback`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `15 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - inline-host-native-ui (test:mcp-app-ui): The local default result is compact and inline, adapts to host theme/style/font/safe-area context, and uses accessible responsive disclosures. Evidence: The protocol-host harness runs the bundled UI with light/dark context updates, safe-area and style tokens, responsive/fallback CSS, semantic disclosures and structured/text-only render paths.
  - research-data-fidelity (test:mcp-app-ui, test:presentation): The view preserves exact returned research values, identity, timestamps, sources, warnings and missing data without unsafe links or unescaped content. Evidence: The UI harness compares discovery/comparison/research values, provenance, caveats and text/structured parity; it rejects hostile markup and unsafe links. Presentation regressions pass.
  - safe-local-delivery (test:mcp-app-ui, test:demo-mode, typecheck, build, test:core-product-phase-plan, test:jev-shadow): Local implementation remains research-only, preserves product regressions and does not add website, wallet, signing or trading behavior. Evidence: The UI harness asserts no trade controls; Demo rejects unsafe actions; typecheck/build and phase-ledger plus pass/hold gate-state regressions pass.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T21:14:50.023Z
- Phase: `mcp-agent-native-research-ui`
- Jev provider: `native-jev`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: `blocked` / `repair` / risk `low` / confidence `0.340`
- Agreement: `false`
- Latency: `1049 ms`
- Phase transition: `pause`
- Transition reason: Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.
- Acceptance criteria and supplied evidence:
  - inline-host-native-ui (test:mcp-app-ui): The local default result is compact and inline, adapts to host theme/style/font/safe-area context, and uses accessible responsive disclosures. Evidence: The protocol-host harness runs the bundled UI with light/dark context updates, safe-area and style tokens, responsive/fallback CSS, semantic disclosures and structured/text-only render paths.
  - research-data-fidelity (test:mcp-app-ui, test:presentation): The view preserves exact returned research values, identity, timestamps, sources, warnings and missing data without unsafe links or unescaped content. Evidence: The UI harness compares discovery/comparison/research values, provenance, caveats and text/structured parity; it rejects hostile markup and unsafe links. Presentation regressions pass.
  - safe-local-delivery (test:mcp-app-ui, test:demo-mode, typecheck, build, test:core-product-phase-plan, test:jev-shadow): Local implementation remains research-only, preserves product regressions and does not add website, wallet, signing or trading behavior. Evidence: The UI harness asserts no trade controls; Demo rejects unsafe actions; typecheck/build and phase-ledger plus pass/hold gate-state regressions pass.
- Jev confidence by review item: status=0.800, nextAction=0.340, riskLevel=0.390, criterion_inline-host-native-ui=0.870, criterion_research-data-fidelity=0.940, criterion_safe-local-delivery=0.940
- Jev criterion findings: Criterion inline-host-native-ui: met (0.870 confidence) — The local default result is compact and inline, adapts to host theme/style/font/safe-area context, and uses accessible responsive disclosures.; Criterion research-data-fidelity: met (0.940 confidence) — The view preserves exact returned research values, identity, timestamps, sources, warnings and missing data without unsafe links or unescaped content.; Criterion safe-local-delivery: met (0.940 confidence) — Local implementation remains research-only, preserves product regressions and does not add website, wallet, signing or trading behavior.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T21:45:40.245Z
- Phase: `mcp-agent-native-research-ui`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.940`
- Agreement: `true`
- Latency: `1682 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - inline-host-native-ui (test:mcp-app-ui): The local and refreshed connected MCP UI resource use a compact Agent-native hierarchy, adapt to supplied host style/theme/safe-area context, and keep evidence progressively disclosed. Evidence: The bundled protocol-host test applies light/dark updates, host tokens/fonts/safe areas, renders compact structured/text-only results and verifies semantic disclosures; after reconnect the actual served resource was independently inspected and old dashboard markers were absent.
  - research-data-fidelity (test:mcp-app-ui, test:presentation): The view and connected read-only research call preserve exact issuer identities, source timestamps, warnings and missing fields without unsafe links or unescaped content. Evidence: The UI harness compares research values/identities and text/structured parity, provenance, caveats, safe links and hostile-string escaping; presentation regressions pass. The refreshed connected resource and successful read-only NVDA result were directly checked.
  - safe-local-delivery (test:mcp-app-ui, test:demo-mode, typecheck, build, test:core-product-phase-plan, test:jev-shadow): The phase remains research-only and preserves safety/regression boundaries without changing website, wallet, signing, trading or transaction behavior. Evidence: The UI harness asserts no transaction affordances, Demo blocks unsafe actions, typecheck/build and phase-plan plus Jev pass/hold transition regressions all pass.
- Jev confidence by review item: status=0.980, nextAction=1.000, riskLevel=1.000, criterion_inline-host-native-ui=0.990, criterion_research-data-fidelity=0.990, criterion_safe-local-delivery=0.940
- Jev criterion findings: Criterion inline-host-native-ui: met (0.990 confidence) — The local and refreshed connected MCP UI resource use a compact Agent-native hierarchy, adapt to supplied host style/theme/safe-area context, and keep evidence progressively disclosed.; Criterion research-data-fidelity: met (0.990 confidence) — The view and connected read-only research call preserve exact issuer identities, source timestamps, warnings and missing fields without unsafe links or unescaped content.; Criterion safe-local-delivery: met (0.940 confidence) — The phase remains research-only and preserves safety/regression boundaries without changing website, wallet, signing, trading or transaction behavior.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T22:31:01.134Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `deterministic-fallback`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `18 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - isolated-stdio-fixture (test:mcp-confirmation-host-fixture, test:mcp-human-confirmation): A separate stdio MCP server invokes the production confirmation handler for a synthetic plan, and decline leaves it simulated without wallet, network, signing, or broadcast capabilities. Evidence: The fixture test starts a separate local process over MCP stdio, receives the production form-elicitation request, explicitly declines, checks simulated status, and confirms the test server exposes no signing/broadcast tools and makes zero network requests. The in-memory regression separately covers malformed, cancel, unavailable, changed-plan, and explicit accepted-choice handling; its acceptance branch is synthetic and not a human click.
  - actual-codex-host-form (test:mcp-confirmation-host-fixture): The current connected Codex host visibly presents the exact synthetic confirmation form and a decline/cancel response leaves the exact plan simulated. Evidence: Not established by the linked check: it uses a local MCP stdio test client and test server and never calls or observes the connected Codex host. Verifying this criterion requires temporarily adding the isolated synthetic server to local MCP host configuration and reconnecting.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T22:31:50.738Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `native-jev`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: `blocked` / `ask_user` / risk `medium` / confidence `0.260`
- Agreement: `false`
- Latency: `1336 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion actual-codex-host-form: insufficient_evidence — The current connected Codex host visibly presents the exact synthetic confirmation form and a decline/cancel response leaves the exact plan simulated.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - isolated-stdio-fixture (test:mcp-confirmation-host-fixture, test:mcp-human-confirmation): A separate stdio MCP server invokes the production confirmation handler for a synthetic plan, and decline leaves it simulated without wallet, network, signing, or broadcast capabilities. Evidence: The fixture test starts a separate local process over MCP stdio, receives the production form-elicitation request, explicitly declines, checks simulated status, and confirms the test server exposes no signing/broadcast tools and makes zero network requests. The in-memory regression separately covers malformed, cancel, unavailable, changed-plan, and explicit accepted-choice handling; its acceptance branch is synthetic and not a human click.
  - actual-codex-host-form (test:mcp-confirmation-host-fixture): The current connected Codex host visibly presents the exact synthetic confirmation form and a decline/cancel response leaves the exact plan simulated. Evidence: Not established by the linked check: it uses a local MCP stdio test client and test server and never calls or observes the connected Codex host. Verifying this criterion requires temporarily adding the isolated synthetic server to local MCP host configuration and reconnecting.
- Jev confidence by review item: status=0.820, nextAction=0.370, riskLevel=0.260, criterion_isolated-stdio-fixture=0.990, criterion_actual-codex-host-form=0.600
- Jev criterion findings: Criterion isolated-stdio-fixture: met (0.990 confidence) — A separate stdio MCP server invokes the production confirmation handler for a synthetic plan, and decline leaves it simulated without wallet, network, signing, or broadcast capabilities.; Criterion actual-codex-host-form: insufficient_evidence (0.600 confidence) — The current connected Codex host visibly presents the exact synthetic confirmation form and a decline/cancel response leaves the exact plan simulated.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-09-30T22:33:52.166Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `native-jev`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: `blocked` / `ask_user` / risk `low` / confidence `0.480`
- Agreement: `false`
- Latency: `2537 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion actual-codex-host-form: insufficient_evidence — The current connected Codex host visibly presents the exact synthetic confirmation form and a decline/cancel response leaves the exact plan simulated.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - isolated-stdio-fixture (test:mcp-confirmation-host-fixture, test:mcp-human-confirmation): A separate stdio MCP server invokes the production confirmation handler for a synthetic plan, and decline leaves it simulated without wallet, network, signing, or broadcast capabilities. Evidence: The fixture test starts a separate local process over MCP stdio, receives the production form-elicitation request, explicitly declines, checks simulated status, and confirms the test server exposes no signing/broadcast tools and makes zero network requests. The in-memory regression separately covers malformed, cancel, unavailable, changed-plan, and explicit accepted-choice handling; its acceptance branch is synthetic and not a human click.
  - actual-codex-host-form (test:mcp-confirmation-host-fixture): The current connected Codex host visibly presents the exact synthetic confirmation form and a decline/cancel response leaves the exact plan simulated. Evidence: Not established by the linked check: it uses a local MCP stdio test client and test server and never calls or observes the connected Codex host. Verifying this criterion requires temporarily adding the isolated synthetic server to local MCP host configuration and reconnecting.
- Jev confidence by review item: status=0.800, nextAction=0.480, riskLevel=0.540, criterion_isolated-stdio-fixture=0.990, criterion_actual-codex-host-form=0.610
- Jev criterion findings: Criterion isolated-stdio-fixture: met (0.990 confidence) — A separate stdio MCP server invokes the production confirmation handler for a synthetic plan, and decline leaves it simulated without wallet, network, signing, or broadcast capabilities.; Criterion actual-codex-host-form: insufficient_evidence (0.610 confidence) — The current connected Codex host visibly presents the exact synthetic confirmation form and a decline/cancel response leaves the exact plan simulated.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-01T15:23:36.973Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `deterministic-fallback`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `14 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - isolated-stdio-confirmation (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture): The production confirmation handler presents the exact synthetic plan to an MCP protocol client and decline/cancel leaves it simulated without wallet, network, signing or broadcast capability. Evidence: Both local MCP protocol checks pass; the isolated stdio host explicitly declines TESTB and asserts simulated status, zero network requests and no wallet, signing or broadcast tools.
  - connected-codex-form (test:mcp-confirmation-host-fixture): The current connected Codex host visibly presents the exact synthetic confirmation form and a decline or cancel response leaves the exact plan simulated. Evidence: The latest connected-host tool invocation returned unavailable after the form-capability flag was true; no form was observed and the separate status call confirms the plan remains simulated. The linked regression is only a local stdio harness, not connected-host UI evidence.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-01T16:23:57.937Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `deterministic-fallback`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `14 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - modern-and-legacy-protocol (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, build): The confirmation tool works through modern multi-round-trip elicitation and retains legacy-client compatibility without adding execution side effects. Evidence: The modern client negotiates the 2026-07-28 protocol and tests explicit accept, decline and cancel; the legacy client receives the form and declines. Both assert the synthetic flow has zero network calls and no wallet, signing or broadcast capability.
  - exact-plan-safe-transition (test:mcp-human-confirmation, test:plan-registry): Only an explicit accepted response for the exact active simulated plan advances it; changed, expired, malformed, declined, cancelled and replayed attempts do not. Evidence: Deterministic modern protocol cases validate exact-plan continuation, explicit approval and decline/cancel; registry regressions reject changed, expired, invalid-stage and replayed plans. No signing or broadcast is involved.
  - connected-agent-form (test:mcp-confirmation-host-fixture): The current connected Agent host visibly presents the exact synthetic confirmation form and its decline/cancel response leaves that exact plan simulated. Evidence: Not established: the linked check is a local stdio client, not the connected host. Read-only inspection of the connected fixture returned the original fixed plan ID with an expired timestamp, so I did not submit it. Actual current-host UI and response behavior remain unverified.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-01T16:24:51.921Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `deterministic-fallback`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `10540 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - modern-and-legacy-protocol (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, build): The confirmation tool works through modern multi-round-trip elicitation and retains legacy-client compatibility without adding execution side effects. Evidence: The modern client negotiates the 2026-07-28 protocol and tests explicit accept, decline and cancel; the legacy client receives the form and declines. Both assert the synthetic flow has zero network calls and no wallet, signing or broadcast capability.
  - exact-plan-safe-transition (test:mcp-human-confirmation, test:plan-registry): Only an explicit accepted response for the exact active simulated plan advances it; changed, expired, malformed, declined, cancelled and replayed attempts do not. Evidence: Deterministic modern protocol cases validate exact-plan continuation, explicit approval and decline/cancel; registry regressions reject changed, expired, invalid-stage and replayed plans. No signing or broadcast is involved.
  - connected-agent-form (test:mcp-confirmation-host-fixture): The current connected Agent host visibly presents the exact synthetic confirmation form and its decline/cancel response leaves that exact plan simulated. Evidence: Not established: the linked check is a local stdio client, not the connected host. Read-only inspection of the connected fixture returned the original fixed plan ID with an expired timestamp, so I did not submit it. Actual current-host UI and response behavior remain unverified.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-01T16:30:16.470Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `native-jev`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: `blocked` / `repair` / risk `medium` / confidence `0.470`
- Agreement: `false`
- Latency: `1337 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion connected-agent-form: insufficient_evidence — The current connected Agent host visibly presents the exact synthetic confirmation form and its decline/cancel response leaves that exact plan simulated.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - modern-and-legacy-protocol (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, build): The confirmation tool works through modern multi-round-trip elicitation and retains legacy-client compatibility without adding execution side effects. Evidence: The modern client negotiates the 2026-07-28 protocol and tests explicit accept, decline and cancel; the legacy client receives the form and declines. Both assert the synthetic flow has zero network calls and no wallet, signing or broadcast capability.
  - exact-plan-safe-transition (test:mcp-human-confirmation, test:plan-registry): Only an explicit accepted response for the exact active simulated plan advances it; changed, expired, malformed, declined, cancelled and replayed attempts do not. Evidence: Deterministic modern protocol cases validate exact-plan continuation, explicit approval and decline/cancel; registry regressions reject changed, expired, invalid-stage and replayed plans. No signing or broadcast is involved.
  - connected-agent-form (test:mcp-confirmation-host-fixture): The current connected Agent host visibly presents the exact synthetic confirmation form and its decline/cancel response leaves that exact plan simulated. Evidence: Not established: the linked check is a local stdio client, not the connected host. Read-only inspection of the connected fixture returned the original fixed plan ID with an expired timestamp, so I did not submit it. Actual current-host UI and response behavior remain unverified.
- Jev confidence by review item: status=0.710, nextAction=0.900, riskLevel=0.470, criterion_modern-and-legacy-protocol=0.900, criterion_exact-plan-safe-transition=0.950, criterion_connected-agent-form=0.530
- Jev criterion findings: Criterion modern-and-legacy-protocol: met (0.900 confidence) — The confirmation tool works through modern multi-round-trip elicitation and retains legacy-client compatibility without adding execution side effects.; Criterion exact-plan-safe-transition: met (0.950 confidence) — Only an explicit accepted response for the exact active simulated plan advances it; changed, expired, malformed, declined, cancelled and replayed attempts do not.; Criterion connected-agent-form: insufficient_evidence (0.530 confidence) — The current connected Agent host visibly presents the exact synthetic confirmation form and its decline/cancel response leaves that exact plan simulated.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-01T16:55:29.981Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `deterministic-fallback`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: unavailable
- Agreement: `unknown`
- Latency: `14 ms`
- Phase transition: `pause`
- Transition reason: Jev unavailable; remain paused and use the deterministic result for observation only.
- Acceptance criteria and supplied evidence:
  - modern-and-legacy-protocol (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, typecheck, build): Modern multi-round-trip and legacy MCP hosts handle explicit confirmation without adding wallet, network, signing, or broadcast side effects. Evidence: The modern protocol test covers explicit approval, decline, cancel, and unsupported form capability; the legacy stdio fixture declines. Both retain simulated/rejected state as required and report zero real-wallet use, network calls, signing tools, and broadcast tools.
  - exact-plan-safe-transition (test:mcp-human-confirmation, test:plan-registry): Only an explicit approval for the exact active simulated plan advances; malformed, changed, forged, expired, declined, cancelled, and replayed continuations fail closed. Evidence: Deterministic production-handler tests now reject malformed choices, forged continuation state, changed plan contents, expired continuation state, replay, decline, and cancel. Exact explicit approval advances once; registry mutation and replay cases also pass.
  - connected-agent-form (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture): The current connected Agent host visibly renders the exact synthetic confirmation form and its decline or cancel leaves the same plan simulated. Evidence: Not yet established: current connected tools still return fixed plan ID synthetic_confirmation_host_fixture with an expired timestamp; status reports not_found_or_expired while the form capability is advertised. No connected form was rendered in this turn. Local stdio tests are protocol evidence only.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-01T16:56:21.038Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `native-jev`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: `blocked` / `repair` / risk `medium` / confidence `0.310`
- Agreement: `false`
- Latency: `1506 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion connected-agent-form: gap — The current connected Agent host visibly renders the exact synthetic confirmation form and its decline or cancel leaves the same plan simulated.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - modern-and-legacy-protocol (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, typecheck, build): Modern multi-round-trip and legacy MCP hosts handle explicit confirmation without adding wallet, network, signing, or broadcast side effects. Evidence: The modern protocol test covers explicit approval, decline, cancel, and unsupported form capability; the legacy stdio fixture declines. Both retain simulated/rejected state as required and report zero real-wallet use, network calls, signing tools, and broadcast tools.
  - exact-plan-safe-transition (test:mcp-human-confirmation, test:plan-registry): Only an explicit approval for the exact active simulated plan advances; malformed, changed, forged, expired, declined, cancelled, and replayed continuations fail closed. Evidence: Deterministic production-handler tests now reject malformed choices, forged continuation state, changed plan contents, expired continuation state, replay, decline, and cancel. Exact explicit approval advances once; registry mutation and replay cases also pass.
  - connected-agent-form (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture): The current connected Agent host visibly renders the exact synthetic confirmation form and its decline or cancel leaves the same plan simulated. Evidence: Not yet established: current connected tools still return fixed plan ID synthetic_confirmation_host_fixture with an expired timestamp; status reports not_found_or_expired while the form capability is advertised. No connected form was rendered in this turn. Local stdio tests are protocol evidence only.
- Jev confidence by review item: status=0.620, nextAction=0.850, riskLevel=0.340, criterion_modern-and-legacy-protocol=0.950, criterion_exact-plan-safe-transition=0.960, criterion_connected-agent-form=0.310
- Jev criterion findings: Criterion modern-and-legacy-protocol: met (0.950 confidence) — Modern multi-round-trip and legacy MCP hosts handle explicit confirmation without adding wallet, network, signing, or broadcast side effects.; Criterion exact-plan-safe-transition: met (0.960 confidence) — Only an explicit approval for the exact active simulated plan advances; malformed, changed, forged, expired, declined, cancelled, and replayed continuations fail closed.; Criterion connected-agent-form: gap (0.310 confidence) — The current connected Agent host visibly renders the exact synthetic confirmation form and its decline or cancel leaves the same plan simulated.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-01T17:00:18.518Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `native-jev`
- Baseline: `blocked` / `stop` / risk `high`
- Jev: `blocked` / `repair` / risk `medium` / confidence `0.380`
- Agreement: `false`
- Latency: `1731 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion connected-agent-form: gap — The current connected Agent host visibly renders the exact synthetic confirmation form and its decline or cancel leaves the same plan simulated.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - modern-and-legacy-protocol (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, typecheck, build): Modern multi-round-trip and legacy MCP hosts handle explicit confirmation without adding wallet, network, signing, or broadcast side effects. Evidence: The modern protocol test covers explicit approval, decline, cancel, and unsupported form capability; the legacy stdio fixture declines. Both retain simulated/rejected state as required and report zero real-wallet use, network calls, signing tools, and broadcast tools.
  - exact-plan-safe-transition (test:mcp-human-confirmation, test:plan-registry): Only an explicit approval for the exact active simulated plan advances; malformed, changed, forged, expired, declined, cancelled, and replayed continuations fail closed. Evidence: Deterministic production-handler tests now reject malformed choices, forged continuation state, changed plan contents, expired continuation state, replay, decline, and cancel. Exact explicit approval advances once; registry mutation and replay cases also pass.
  - connected-agent-form (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture): The current connected Agent host visibly renders the exact synthetic confirmation form and its decline or cancel leaves the same plan simulated. Evidence: Not yet established: current connected tools still return fixed plan ID synthetic_confirmation_host_fixture with an expired timestamp; status reports not_found_or_expired while the form capability is advertised. No connected form was rendered in this turn. Local stdio tests are protocol evidence only.
- Jev confidence by review item: status=0.600, nextAction=0.840, riskLevel=0.380, criterion_modern-and-legacy-protocol=0.940, criterion_exact-plan-safe-transition=0.950, criterion_connected-agent-form=0.390
- Jev criterion findings: Criterion modern-and-legacy-protocol: met (0.940 confidence) — Modern multi-round-trip and legacy MCP hosts handle explicit confirmation without adding wallet, network, signing, or broadcast side effects.; Criterion exact-plan-safe-transition: met (0.950 confidence) — Only an explicit approval for the exact active simulated plan advances; malformed, changed, forged, expired, declined, cancelled, and replayed continuations fail closed.; Criterion connected-agent-form: gap (0.390 confidence) — The current connected Agent host visibly renders the exact synthetic confirmation form and its decline or cancel leaves the same plan simulated.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Phase 18 connected-host decline verification — 2026-10-02

- After reconnection, the isolated connected server returned a fresh synthetic TESTB plan and advertised form elicitation. The plan metadata explicitly excluded network, real-wallet, signing and broadcast capability.
- The connected confirmation request returned `confirmationStatus: declined` for the exact plan. The response and follow-up status both kept it `simulated`; `broadcasted` was false and `sideEffects` was `none`.
- This verifies a connected-host decline path, not a screenshot-based visual-quality review. The prior Jev confidence of 0.380 predates this host interaction; the fresh phase-gate review is pending. Phase 19 remains gated on that result.

### Jev phase-gate record — 2026-10-02T11:48:11.627Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.830`
- Agreement: `true`
- Latency: `1358 ms`
- Phase transition: `pause`
- Transition reason: Criterion exact-plan-safe-transition lacks a sufficiently confident Jev review (0.830); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - modern-and-legacy-protocol (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, typecheck, build): Modern and legacy MCP clients handle explicit confirmation without wallet, network, signing, or broadcast side effects. Evidence: Modern tests cover explicit approval, decline, cancellation and unavailable host; the stdio fixture performs the real SDK elicitation round-trip and declines. Both assert synthetic-only behavior and zero wallet, network, signing, or broadcast use.
  - exact-plan-safe-transition (test:mcp-human-confirmation, test:plan-registry): Only an explicit approval for the exact active simulated plan advances; decline, cancellation, malformed, changed, expired, forged, or replayed continuations fail closed. Evidence: Production-handler and registry regressions verify exact-plan binding, one-time approval, decline/cancel retention, malformed and tampered continuation rejection, expiry, mutation, and replay.
  - connected-agent-form (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, test:core-product-phase-plan): The current connected MCP host handles an elicitation request for the exact fresh synthetic plan and returns a decline while that same plan remains simulated. Evidence: After reconnect, the connected tool returned a fresh synthetic TESTB plan; confirmation returned declined for that exact plan, and the subsequent status read remained simulated. The result reported broadcasted false and sideEffects none. No screenshot-based visual review is claimed.
  - local-regression-and-scope (test:core-product-phase-plan, test:jev-shadow, test:mcp-app-ui, test:demo-mode, test:core-hardening, typecheck, build): Phase scope, read-only research UI and Demo behavior, local safety regressions, typecheck and build pass without transaction or release side effects. Evidence: All selected local checks pass, preserving approved phase boundaries, synthetic-only/demo no-action behavior, native research UI parity and safety. Website, release, wallet signing, broadcast, deployment and paid services remain excluded.
- Jev confidence by review item: status=0.940, nextAction=0.990, riskLevel=1.000, criterion_modern-and-legacy-protocol=0.920, criterion_exact-plan-safe-transition=0.830, criterion_connected-agent-form=0.970, criterion_local-regression-and-scope=0.870
- Jev criterion findings: Criterion modern-and-legacy-protocol: met (0.920 confidence) — Modern and legacy MCP clients handle explicit confirmation without wallet, network, signing, or broadcast side effects.; Criterion exact-plan-safe-transition: met (0.830 confidence) — Only an explicit approval for the exact active simulated plan advances; decline, cancellation, malformed, changed, expired, forged, or replayed continuations fail closed.; Criterion connected-agent-form: met (0.970 confidence) — The current connected MCP host handles an elicitation request for the exact fresh synthetic plan and returns a decline while that same plan remains simulated.; Criterion local-regression-and-scope: met (0.870 confidence) — Phase scope, read-only research UI and Demo behavior, local safety regressions, typecheck and build pass without transaction or release side effects.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T11:54:31.161Z
- Phase: `mcp-confirmation-host-interop`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.860`
- Agreement: `true`
- Latency: `894 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - modern-and-legacy-protocol (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, typecheck, build): Modern and legacy MCP clients handle explicit confirmation without wallet, network, signing, or broadcast side effects. Evidence: Modern tests cover explicit approval, decline, cancellation and unavailable hosts. The real-SDK stdio fixture checks form mode, its exact approve/decline choices, and simulated state after decline. All assert zero wallet, network, signing, or broadcast use.
  - exact-plan-safe-transition (test:mcp-human-confirmation, test:plan-registry): The form discloses the registered plan details; only one explicit approval for that exact plan advances it, while altered or repeated submissions cannot change the registered outcome. Evidence: Assertions compare every decision-critical form field (operation, amount, addresses, asset/platform, chain, target/value, output, gas cap, expiry) to fixture values. Approval preserves planId/intent/output and confirms once; a changed output returns the specific rejection with sideEffects none and leaves the original simulated. Repeated approval cannot advance again; malformed, forged, expired and replayed continuations are rejected.
  - connected-agent-form (test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, test:core-product-phase-plan): The current connected MCP host handles an elicitation request for the exact fresh synthetic plan and returns a decline while that same plan remains simulated. Evidence: After reconnect, the connected tool returned a fresh synthetic TESTB plan; confirmation returned declined for that exact plan, and the subsequent status read remained simulated. The result reported broadcasted false and sideEffects none. No screenshot-based visual review is claimed.
  - local-regression-and-scope (test:core-product-phase-plan, test:jev-shadow, test:mcp-app-ui, test:demo-mode, test:core-hardening, typecheck, build): Phase scope, read-only research UI and Demo behavior, local safety regressions, typecheck and build pass without transaction or release side effects. Evidence: All selected local checks pass, preserving approved phase boundaries, synthetic-only/demo no-action behavior, native research UI parity and safety. Website, release, wallet signing, broadcast, deployment and paid services remain excluded.
- Jev confidence by review item: status=0.960, nextAction=0.990, riskLevel=1.000, criterion_modern-and-legacy-protocol=0.970, criterion_exact-plan-safe-transition=0.980, criterion_connected-agent-form=0.990, criterion_local-regression-and-scope=0.860
- Jev criterion findings: Criterion modern-and-legacy-protocol: met (0.970 confidence) — Modern and legacy MCP clients handle explicit confirmation without wallet, network, signing, or broadcast side effects.; Criterion exact-plan-safe-transition: met (0.980 confidence) — The form discloses the registered plan details; only one explicit approval for that exact plan advances it, while altered or repeated submissions cannot change the registered outcome.; Criterion connected-agent-form: met (0.990 confidence) — The current connected MCP host handles an elicitation request for the exact fresh synthetic plan and returns a decline while that same plan remains simulated.; Criterion local-regression-and-scope: met (0.860 confidence) — Phase scope, read-only research UI and Demo behavior, local safety regressions, typecheck and build pass without transaction or release side effects.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T12:04:58.386Z
- Phase: `sdk-cleanroom-revalidation`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.910`
- Agreement: `true`
- Latency: `1594 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - isolated-sdk-consumption (test:cleanroom, typecheck, build): A freshly packed local tarball installs into an isolated consumer and supports documented ESM imports, public declarations, root exports and Node engine requirements. Evidence: The clean-room test uses a new consumer directory and npm cache, installs the local .tgz without registry writes, imports BinanceWeb3Client, BinanceWeb3Error, TokenizedStocksService and compareAgentAssets, type-checks public config/event types, and verifies root exports plus Node >=22.19.0.
  - package-surface-and-example (test:distribution, test:sdk-example, pack:check, build): The local package artifact includes its public runtime, declarations and docs; package metadata, MCP examples and documented SDK usage remain coherent. Evidence: Distribution assertions verify package entrypoints, Node engine, demo/live MCP configs and no secret in the example config. The SDK example references the public client/services and search/marketContext; npm pack --dry-run builds and enumerates the local artifact without publishing.
  - bounded-isolated-failure (test:cleanroom, test:core-product-phase-plan, test:jev-shadow): The consumer test is repeatable and bounded; timeout or known registry/network failure is explicitly inconclusive, and only the owned temporary consumer directory is cleaned. Evidence: Phase-plan regression checks the unique per-run cache, 180-second install cap, 30-second fetch cap, retries disabled, inconclusive classification and finally cleanup. Jev state-machine tests keep advancement gated on passing checks and Jev review. No package publish or registry write is part of these scripts.
- Jev confidence by review item: status=0.960, nextAction=0.990, riskLevel=1.000, criterion_isolated-sdk-consumption=0.990, criterion_package-surface-and-example=0.910, criterion_bounded-isolated-failure=0.930
- Jev criterion findings: Criterion isolated-sdk-consumption: met (0.990 confidence) — A freshly packed local tarball installs into an isolated consumer and supports documented ESM imports, public declarations, root exports and Node engine requirements.; Criterion package-surface-and-example: met (0.910 confidence) — The local package artifact includes its public runtime, declarations and docs; package metadata, MCP examples and documented SDK usage remain coherent.; Criterion bounded-isolated-failure: met (0.930 confidence) — The consumer test is repeatable and bounded; timeout or known registry/network failure is explicitly inconclusive, and only the owned temporary consumer directory is cleaned.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T12:13:49.254Z
- Phase: `demo-mode-journey-coverage`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.940`
- Agreement: `true`
- Latency: `1431 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - deterministic-demo-journeys (test:demo-mode, test:asset-intent-query): The credential-free Demo MCP supports deterministic discovery across its seeded tickers, natural-language research, issuer-aware comparisons, platform filtering, and market-detail lookup without guessing between companies. Evidence: MCP stdio regressions discover seven seeded tickers, compare both TSLA issuers, filter to a chosen platform, resolve a Chinese NVIDIA request, block compound NVDA/TSLA ambiguity, and retrieve market detail only for a registered exact fixture identity.
  - synthetic-evidence-parity (test:demo-mode, test:presentation, test:mcp-app-ui): All Demo evidence is visibly synthetic and deterministic; fixed/stale timestamps, unknown market status and missing liquidity are explicit and preserved consistently in text, structured content and the native research view. Evidence: Tests assert synthetic metadata and explicit synthetic/fixed-time warnings, stable timestamps across issuers and research entry points, unchanged unknown/missing fields, exact text-to-structured equality, and the native view badge/caveat rendering.
  - failure-and-input-boundaries (test:demo-mode, test:asset-intent-query, test:mcp-enrichment, test:core-hardening): Unsupported, malformed and ambiguous requests do not fabricate or guess; provider/network/integrity errors fail closed with sanitized categories and missing market values are never treated as zero. Evidence: Tests cover empty and unsupported queries, compound-entity ambiguity, arbitrary unregistered detail rejection, sanitized provider/network/integrity failures, and explicit absent/unknown data instead of zero substitution.
  - demo-safety-and-build (test:demo-mode, test:mcp-app-ui, test:core-hardening, test:core-product-phase-plan, test:jev-shadow, typecheck, build): Demo action preparation and forged transaction paths remain blocked; product, UI, type/build, roadmap-state and Jev-gate regressions pass within local scope. Evidence: Demo ActionPlan preparation remains blocked, forged simulation/confirmation/broadcast/RFQ plans are rejected, the read-only research UI has no trade controls, and deterministic scope/build/gate checks pass. No website, wallet, signature, broadcast, release or external write is included.
- Jev confidence by review item: status=0.950, nextAction=0.990, riskLevel=1.000, criterion_deterministic-demo-journeys=0.990, criterion_synthetic-evidence-parity=0.970, criterion_failure-and-input-boundaries=0.940, criterion_demo-safety-and-build=0.970
- Jev criterion findings: Criterion deterministic-demo-journeys: met (0.990 confidence) — The credential-free Demo MCP supports deterministic discovery across its seeded tickers, natural-language research, issuer-aware comparisons, platform filtering, and market-detail lookup without guessing between companies.; Criterion synthetic-evidence-parity: met (0.970 confidence) — All Demo evidence is visibly synthetic and deterministic; fixed/stale timestamps, unknown market status and missing liquidity are explicit and preserved consistently in text, structured content and the native research view.; Criterion failure-and-input-boundaries: met (0.940 confidence) — Unsupported, malformed and ambiguous requests do not fabricate or guess; provider/network/integrity errors fail closed with sanitized categories and missing market values are never treated as zero.; Criterion demo-safety-and-build: met (0.970 confidence) — Demo action preparation and forged transaction paths remain blocked; product, UI, type/build, roadmap-state and Jev-gate regressions pass within local scope.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T12:51:28.302Z
- Phase: `provider-data-resilience`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.330`
- Agreement: `true`
- Latency: `1449 ms`
- Phase transition: `pause`
- Transition reason: Jev confidence is below the minimum threshold (0.85); the least-certain review item is nextAction (0.330). Add or clarify evidence for that item, then review again.
- Acceptance criteria and supplied evidence:
  - provider-observation-honesty (test:asset-directory, test:mcp-enrichment, test:core-product-phase-plan): Treat returned inventory, status, timestamps and filter equality as bounded observations; do not claim catalog completeness or a freshness SLA from missing provider evidence. Evidence: Local checks cover exact representation identity, timestamped quote matching and sanitized missing-data behavior. Separately, the six-call read-only probe completed once and a repeat was partial; the paired sample was 545 declared versus 488 returned, with no verified completeness or freshness contract.
  - documented-status-normalization (test:domain, test:core-hardening, test:mcp-app-ui): Normalize the documented Binance market-status enum safely and retain unknown values as unknown. Evidence: Domain regressions cover regular/open, premarket/postmarket/overnight as offhours, closed/pause as non-tradable, and an undocumented future value remaining unknown. The probe observed 442 supplied status strings and 46 missing values in 488 rows.
  - bounded-retry-response-integrity (test:retry-policy, typecheck, build): Bound retry attempts and waits, honor both supported Retry-After formats, and fail malformed provider responses without retry or payload leakage. Evidence: The local test covers numeric-seconds and HTTP-date Retry-After, budget rejection without early retry, bounded timeout attempts, actual status observations, and non-retryable invalid JSON/envelopes without reflecting response text.
  - failure-parity-and-approved-scope (test:mcp-enrichment, test:mcp-app-ui, test:core-hardening, test:jev-shadow, test:core-product-phase-plan): Provider failures remain explicit and safe across MCP/native research; the phase introduces no transaction or external-write behavior. Evidence: Selected checks verify sanitized fail-closed enrichment, read-only native research, missing/closed market safety, phase-gate behavior, and the approved exclusion of website, wallet, signing, broadcast, publication and external writes.
- Jev confidence by review item: status=0.950, nextAction=0.330, riskLevel=0.340, criterion_provider-observation-honesty=0.870, criterion_documented-status-normalization=0.920, criterion_bounded-retry-response-integrity=0.980, criterion_failure-parity-and-approved-scope=0.910, deferredScope=0.810
- Jev criterion findings: Criterion provider-observation-honesty: met (0.870 confidence) — Treat returned inventory, status, timestamps and filter equality as bounded observations; do not claim catalog completeness or a freshness SLA from missing provider evidence.; Criterion documented-status-normalization: met (0.920 confidence) — Normalize the documented Binance market-status enum safely and retain unknown values as unknown.; Criterion bounded-retry-response-integrity: met (0.980 confidence) — Bound retry attempts and waits, honor both supported Retry-After formats, and fail malformed provider responses without retry or payload leakage.; Criterion failure-parity-and-approved-scope: met (0.910 confidence) — Provider failures remain explicit and safe across MCP/native research; the phase introduces no transaction or external-write behavior.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T12:54:37.442Z
- Phase: `provider-data-resilience`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.970`
- Agreement: `true`
- Latency: `1212 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - provider-observation-honesty (test:asset-directory, test:mcp-enrichment, test:core-product-phase-plan): Treat returned inventory, status, timestamps and filter equality as bounded observations; do not claim catalog completeness or a freshness SLA from missing provider evidence. Evidence: Local checks cover exact representation identity, timestamped quote matching and sanitized missing-data behavior. A six-call live read-only probe completed once; a later bounded repeat was partial. The paired sample was 545 declared versus 488 returned; docs provide no verified completeness or freshness contract, as Phase 21 explicitly anticipates.
  - documented-status-normalization (test:domain, test:core-hardening, test:mcp-app-ui): Normalize the documented Binance market-status enum safely and retain unknown values as unknown. Evidence: Domain regressions cover regular/open, premarket/postmarket/overnight as offhours, closed/pause as non-tradable, and an undocumented future value remaining unknown. The read-only probe saw 442 supplied status strings and 46 missing values in 488 rows; normalization now maps the documented values only.
  - bounded-retry-response-integrity (test:retry-policy, typecheck, build): Bound retry attempts and waits, honor both supported Retry-After formats, and fail malformed provider responses without retry or payload leakage. Evidence: The local test covers numeric-seconds and HTTP-date Retry-After, budget rejection without early retry, bounded timeout attempts, actual status observations, and non-retryable invalid JSON/envelopes without reflecting response text.
  - failure-parity-and-approved-scope (test:mcp-enrichment, test:mcp-app-ui, test:core-hardening, test:jev-shadow, test:core-product-phase-plan): Provider failures remain explicit and safe across MCP/native research; Phase 21 introduces no transaction or external-write behavior. Evidence: Checks verify sanitized fail-closed enrichment, read-only native research, missing/closed-market safety and bounded gate sequencing. All external requests in this phase were the already approved serial read-only GET probe; no wallet data, write, new paid provider, signature, broadcast, deployment or release was involved.
  - preapproved-phase22-continuation (test:core-product-phase-plan, test:jev-shadow): After Phase 21 approval, continue only into Phase 22 already included in the user-approved Phases 18–23 plan; do not request routine phase-by-phase reapproval or exceed the existing scope. Evidence: The phase-plan regression states Phases 18–23 were approved as one bounded continuation, confirms Phase 22 is the named successor, and Jev-state tests verify approved phases advance sequentially only after passing checks and gate approval. Phase 22 is confined to MCP Chinese/English output and text/structured/native-view parity.
- Jev confidence by review item: status=0.990, nextAction=0.990, riskLevel=0.990, criterion_provider-observation-honesty=0.980, criterion_documented-status-normalization=0.970, criterion_bounded-retry-response-integrity=0.990, criterion_failure-parity-and-approved-scope=0.970, criterion_preapproved-phase22-continuation=0.980, deferredScope=0.990
- Jev criterion findings: Criterion provider-observation-honesty: met (0.980 confidence) — Treat returned inventory, status, timestamps and filter equality as bounded observations; do not claim catalog completeness or a freshness SLA from missing provider evidence.; Criterion documented-status-normalization: met (0.970 confidence) — Normalize the documented Binance market-status enum safely and retain unknown values as unknown.; Criterion bounded-retry-response-integrity: met (0.990 confidence) — Bound retry attempts and waits, honor both supported Retry-After formats, and fail malformed provider responses without retry or payload leakage.; Criterion failure-parity-and-approved-scope: met (0.970 confidence) — Provider failures remain explicit and safe across MCP/native research; Phase 21 introduces no transaction or external-write behavior.; Criterion preapproved-phase22-continuation: met (0.980 confidence) — After Phase 21 approval, continue only into Phase 22 already included in the user-approved Phases 18–23 plan; do not request routine phase-by-phase reapproval or exceed the existing scope.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T14:13:49.247Z
- Phase: `agent-output-language-quality`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.810`
- Agreement: `true`
- Latency: `1164 ms`
- Phase transition: `pause`
- Transition reason: Criterion evidence-and-uncertainty-fidelity lacks a sufficiently confident Jev review (0.810); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - bilingual-intent-and-no-trade (test:asset-intent-query, test:demo-mode, test:mcp-natural-language): Chinese and English natural-language requests resolve within the supported intent boundary, and explicit no-trade instructions do not suggest or trigger quote or wallet follow-up actions. Evidence: Intent regressions cover Chinese and English phrasing, ambiguous and unsupported inputs, and explicit no-trade wording. Demo and live MCP journeys verify resolved identity, no-trade presentation, and no side effects.
  - evidence-and-uncertainty-fidelity (test:presentation, test:mcp-enrichment, test:mcp-app-ui, test:asset-intent-query): Identity, quote and reference prices, timestamps, provenance, missing data, unknown status and ambiguity remain distinguishable and are never fabricated or coerced to zero. Evidence: Presentation, enrichment and native UI regressions check field/provenance parity, unknown versus zero, missing liquidity/status, sanitized provider failures and fail-closed ambiguity.
  - bilingual-surface-parity (test:mcp-natural-language, test:mcp-app-ui, test:presentation, test:demo-mode): Chinese and English human-facing research content uses the request language and keeps text, structured content and native MCP research-card evidence aligned. Evidence: Live read-only natural-language MCP and deterministic Demo journeys check Chinese and English content, while rendering and presentation regressions compare card values and text/structured evidence.
  - safety-and-approved-scope (test:core-hardening, test:core-product-phase-plan, test:jev-shadow, test:demo-mode, test:mcp-app-ui): The language and presentation changes remain research-only, preserve execution safety, and stay within the approved Phase 18-23 continuation. Evidence: Safety, Demo, UI, plan and Jev state-machine checks verify research-only behavior, blocked Demo execution, approved sequential phase scope, and no signing or broadcast changes.
  - build-and-regression-integrity (typecheck, build, test:mcp-natural-language, test:mcp-app-ui, test:presentation): The selected Phase 22 implementation type-checks and builds with all linked regressions passing. Evidence: The phase gate reruns TypeScript type checking, production build, live read-only language journey, native MCP App rendering and presentation-contract tests.
- Jev confidence by review item: status=0.990, nextAction=1.000, riskLevel=1.000, criterion_bilingual-intent-and-no-trade=0.930, criterion_evidence-and-uncertainty-fidelity=0.810, criterion_bilingual-surface-parity=0.910, criterion_safety-and-approved-scope=0.920, criterion_build-and-regression-integrity=0.970
- Jev criterion findings: Criterion bilingual-intent-and-no-trade: met (0.930 confidence) — Chinese and English natural-language requests resolve within the supported intent boundary, and explicit no-trade instructions do not suggest or trigger quote or wallet follow-up actions.; Criterion evidence-and-uncertainty-fidelity: met (0.810 confidence) — Identity, quote and reference prices, timestamps, provenance, missing data, unknown status and ambiguity remain distinguishable and are never fabricated or coerced to zero.; Criterion bilingual-surface-parity: met (0.910 confidence) — Chinese and English human-facing research content uses the request language and keeps text, structured content and native MCP research-card evidence aligned.; Criterion safety-and-approved-scope: met (0.920 confidence) — The language and presentation changes remain research-only, preserve execution safety, and stay within the approved Phase 18-23 continuation.; Criterion build-and-regression-integrity: met (0.970 confidence) — The selected Phase 22 implementation type-checks and builds with all linked regressions passing.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T14:18:42.247Z
- Phase: `agent-output-language-quality`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.930`
- Agreement: `true`
- Latency: `1003 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - bilingual-intent-and-no-trade (test:asset-intent-query, test:demo-mode, test:mcp-natural-language): Chinese and English natural-language requests resolve within the supported intent boundary, and explicit no-trade instructions do not suggest or trigger quote or wallet follow-up actions. Evidence: Intent regressions cover Chinese and English phrasing, ambiguous and unsupported inputs, and explicit no-trade wording. Demo and live MCP journeys verify resolved identity, no-trade presentation, and no side effects.
  - evidence-and-uncertainty-fidelity (test:presentation, test:mcp-enrichment, test:mcp-app-ui, test:asset-intent-query): Identity, quote and reference prices, timestamps, provenance, missing data, unknown status and ambiguity remain distinguishable and are never fabricated or coerced to zero. Evidence: A new deterministic bilingual presentation fixture asserts exact distinct token/reference prices and timestamps in English and Chinese cards, briefs and native UI; unknown status and absent liquidity remain explicit, and no liquidity zero is fabricated. Linked enrichment and intent regressions cover source identity, provider failures and ambiguity handling.
  - bilingual-surface-parity (test:mcp-natural-language, test:mcp-app-ui, test:presentation, test:demo-mode): Chinese and English human-facing research content uses the request language and keeps text, structured content and native MCP research-card evidence aligned. Evidence: Live read-only natural-language MCP and deterministic Demo journeys check Chinese and English content, while rendering and presentation regressions compare card values and text/structured evidence.
  - safety-and-approved-scope (test:core-hardening, test:core-product-phase-plan, test:jev-shadow, test:demo-mode, test:mcp-app-ui): The language and presentation changes remain research-only, preserve execution safety, and stay within the approved Phase 18-23 continuation. Evidence: Safety, Demo, UI, plan and Jev state-machine checks verify research-only behavior, blocked Demo execution, approved sequential phase scope, and no signing or broadcast changes.
  - build-and-regression-integrity (typecheck, build, test:mcp-natural-language, test:mcp-app-ui, test:presentation): The selected Phase 22 implementation type-checks and builds with all linked regressions passing. Evidence: The phase gate reruns TypeScript type checking, production build, live read-only language journey, native MCP App rendering and presentation-contract tests.
- Jev confidence by review item: status=0.980, nextAction=1.000, riskLevel=1.000, criterion_bilingual-intent-and-no-trade=0.940, criterion_evidence-and-uncertainty-fidelity=0.960, criterion_bilingual-surface-parity=0.930, criterion_safety-and-approved-scope=0.940, criterion_build-and-regression-integrity=0.970
- Jev criterion findings: Criterion bilingual-intent-and-no-trade: met (0.940 confidence) — Chinese and English natural-language requests resolve within the supported intent boundary, and explicit no-trade instructions do not suggest or trigger quote or wallet follow-up actions.; Criterion evidence-and-uncertainty-fidelity: met (0.960 confidence) — Identity, quote and reference prices, timestamps, provenance, missing data, unknown status and ambiguity remain distinguishable and are never fabricated or coerced to zero.; Criterion bilingual-surface-parity: met (0.930 confidence) — Chinese and English human-facing research content uses the request language and keeps text, structured content and native MCP research-card evidence aligned.; Criterion safety-and-approved-scope: met (0.940 confidence) — The language and presentation changes remain research-only, preserve execution safety, and stay within the approved Phase 18-23 continuation.; Criterion build-and-regression-integrity: met (0.970 confidence) — The selected Phase 22 implementation type-checks and builds with all linked regressions passing.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T14:26:48.220Z
- Phase: `core-local-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.670`
- Agreement: `true`
- Latency: `1100 ms`
- Phase transition: `pause`
- Transition reason: Criterion mcp-research-journey-and-surfaces lacks a sufficiently confident Jev review (0.750); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - independent-sdk-package-consumption (typecheck, build, pack:check, test:cleanroom, test:distribution, test:sdk-example): The SDK builds and the documented package can be consumed from an isolated local artifact with runtime imports, declarations, examples and package metadata intact, without publication. Evidence: Selected checks type-check/build the source, inspect the dry-run package, install the local tarball in an isolated consumer, verify ESM imports/declarations/engine metadata, and check documented SDK usage. No registry publication is invoked.
  - mcp-research-journey-and-surfaces (test:demo-mode, test:asset-intent-query, test:presentation, test:mcp-natural-language, test:mcp-app-ui, test:mcp-enrichment): Demo and live read-only MCP research preserve supported intent, issuer identity, evidence and Chinese/English presentation across structured content and the native research component. Evidence: Deterministic Demo, live read-only SDK/MCP, enrichment, intent, presentation and bundled UI checks cover resolved representations, language/no-trade intent, evidence parity, data caveats and safe failures.
  - execution-safety-regressions (test:domain, test:plan-registry, test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, test:guarded-sdk-executor, test:input-balance, test:gas-safety, test:execution-dry-run, test:core-hardening, test:demo-mode): Research/Demo remain non-executing, and synthetic confirmation, plan, balance, gas, signing and broadcast safeguards retain their fail-closed behavior. Evidence: Local domain, registry, synthetic MCP confirmation, guarded executor, balance/gas, offline rehearsal and Demo safety regressions exercise blocked, declined, malformed, changed, expired and replay paths; they do not use a real wallet or broadcast.
  - reports-and-phase-ledger-reconciled (test:core-product-phase-plan, test:jev-shadow, test:distribution, test:mcp-config): The phase plan, phase-state ledger, Jev history, developer log, interim reports and deferred register agree on the completed and unresolved local-core work. Evidence: The phase-plan regression cross-checks named phase sequence, approval records, current state, report entries, deferred provider limitations and authorized release boundaries; Jev state-machine tests cover sequential approval and pause behavior.
  - bounded-terminal-delivery-scope (test:core-product-phase-plan, test:distribution, test:jev-shadow, test:guarded-sdk-executor, test:execution-dry-run): Completion is recorded only as local SDK/MCP validation; no website work, commit/push, registry/public release, deployment, real-wallet signing, broadcast or funded settlement is claimed or performed. Evidence: Selected scope and safety regressions assert local terminal-state semantics, package metadata without publication, simulated/offline execution boundaries, and no automatic transition into external release or funded execution.
- Jev confidence by review item: status=0.950, nextAction=0.980, riskLevel=1.000, criterion_independent-sdk-package-consumption=0.890, criterion_mcp-research-journey-and-surfaces=0.750, criterion_execution-safety-regressions=0.910, criterion_reports-and-phase-ledger-reconciled=0.670, criterion_bounded-terminal-delivery-scope=0.790
- Jev criterion findings: Criterion independent-sdk-package-consumption: met (0.890 confidence) — The SDK builds and the documented package can be consumed from an isolated local artifact with runtime imports, declarations, examples and package metadata intact, without publication.; Criterion mcp-research-journey-and-surfaces: met (0.750 confidence) — Demo and live read-only MCP research preserve supported intent, issuer identity, evidence and Chinese/English presentation across structured content and the native research component.; Criterion execution-safety-regressions: met (0.910 confidence) — Research/Demo remain non-executing, and synthetic confirmation, plan, balance, gas, signing and broadcast safeguards retain their fail-closed behavior.; Criterion reports-and-phase-ledger-reconciled: met (0.670 confidence) — The phase plan, phase-state ledger, Jev history, developer log, interim reports and deferred register agree on the completed and unresolved local-core work.; Criterion bounded-terminal-delivery-scope: met (0.790 confidence) — Completion is recorded only as local SDK/MCP validation; no website work, commit/push, registry/public release, deployment, real-wallet signing, broadcast or funded settlement is claimed or performed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T14:38:41.525Z
- Phase: `core-local-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.590`
- Agreement: `true`
- Latency: `1281 ms`
- Phase transition: `pause`
- Transition reason: Criterion independent-sdk-package-consumption lacks a sufficiently confident Jev review (0.590); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - independent-sdk-package-consumption (typecheck, build, pack:check, test:cleanroom, test:distribution, test:sdk-example): The SDK builds and the documented package can be consumed from an isolated local artifact with runtime imports, declarations, examples and package metadata intact, without publication. Evidence: Checks typecheck/build, inspect npm pack dry-run, install the local tarball in a fresh-cache isolated consumer, and verify ESM runtime imports, declarations, root exports, Node engine metadata and documented usage. No public registry is contacted for publication.
  - mcp-research-journey-and-surfaces (test:demo-mode, test:asset-intent-query, test:presentation, test:mcp-natural-language, test:mcp-app-ui, test:mcp-enrichment): Demo and live read-only MCP research preserve supported intent, issuer identity, evidence and Chinese/English presentation across structured content and the native research component. Evidence: Live MCP regression now runs both Chinese and English NVDA research. It asserts resolved identity, two BNB representations, exact text/structured parity, English evidence labels, explicit no-trade follow-up suppression and sideEffects none; Demo, presentation, UI and enrichment tests cover deterministic language/data parity and safe failure.
  - execution-safety-regressions (test:domain, test:plan-registry, test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, test:guarded-sdk-executor, test:input-balance, test:gas-safety, test:execution-dry-run, test:core-hardening, test:demo-mode): Research/Demo remain non-executing, and synthetic confirmation, plan, balance, gas, signing and broadcast safeguards retain their fail-closed behavior. Evidence: Local domain, registry, synthetic MCP confirmation, guarded executor, balance/gas, offline rehearsal and Demo regressions exercise blocked, declined, malformed, changed, expired and replay paths. Execution rehearsal is synthetic/offline and asserts zero real wallet use and zero broadcast requests.
  - reports-and-phase-ledger-reconciled (test:core-product-phase-plan, test:jev-shadow, test:distribution, test:mcp-config): The phase plan, phase-state ledger, Jev history, developer log, interim reports and deferred register agree on completed work, evidence class, remaining limitations and the terminal local state. Evidence: The phase-plan regression reads and cross-checks the phase state, Jev history, developer log, product/technical reports, deferred register and explicit six-area Phase 23 matrix. It asserts Phases 18–23 sequential approvals, the recorded Phase 23 pause, and that report language preserves live/host/deferred boundaries.
  - bounded-terminal-delivery-scope (test:core-product-phase-plan, test:distribution, test:jev-shadow, test:guarded-sdk-executor, test:execution-dry-run): Completion is recorded only as local SDK/MCP validation; no website work, commit/push, registry/public release, deployment, real-wallet signing, broadcast or funded settlement is claimed or performed. Evidence: Selected checks assert local terminal-state semantics, package metadata/dry-run without publication, synthetic offline action boundaries, zero broadcast and no automatic transition into external release or funded execution.
- Jev confidence by review item: status=0.990, nextAction=0.900, riskLevel=0.940, criterion_independent-sdk-package-consumption=0.590, criterion_mcp-research-journey-and-surfaces=0.970, criterion_execution-safety-regressions=0.960, criterion_reports-and-phase-ledger-reconciled=0.900, criterion_bounded-terminal-delivery-scope=0.830, deferredScope=1.000
- Jev criterion findings: Criterion independent-sdk-package-consumption: met (0.590 confidence) — The SDK builds and the documented package can be consumed from an isolated local artifact with runtime imports, declarations, examples and package metadata intact, without publication.; Criterion mcp-research-journey-and-surfaces: met (0.970 confidence) — Demo and live read-only MCP research preserve supported intent, issuer identity, evidence and Chinese/English presentation across structured content and the native research component.; Criterion execution-safety-regressions: met (0.960 confidence) — Research/Demo remain non-executing, and synthetic confirmation, plan, balance, gas, signing and broadcast safeguards retain their fail-closed behavior.; Criterion reports-and-phase-ledger-reconciled: met (0.900 confidence) — The phase plan, phase-state ledger, Jev history, developer log, interim reports and deferred register agree on completed work, evidence class, remaining limitations and the terminal local state.; Criterion bounded-terminal-delivery-scope: met (0.830 confidence) — Completion is recorded only as local SDK/MCP validation; no website work, commit/push, registry/public release, deployment, real-wallet signing, broadcast or funded settlement is claimed or performed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-02T14:53:29.227Z
- Phase: `core-local-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.900`
- Agreement: `true`
- Latency: `2385 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - independent-sdk-package-consumption (typecheck, build, pack:check, test:cleanroom, test:distribution, test:sdk-example): The SDK builds and the documented package can be consumed from an isolated local artifact with runtime imports, declarations, examples and package metadata intact, without publication. Evidence: A fresh-cache clean-room test installs only the locally packed tarball, imports its public API, strictly compiles consumer TypeScript, and now executes the documented TokenizedStocksService search→marketContext flow against a loopback-only synthetic server. It checks signed request headers, returned issuer identity, separate token/reference prices, status, field provenance and missing-liquidity warnings. The fixture makes no live-provider request. pack:check is npm pack --dry-run; no npm publish command is selected.
  - mcp-research-journey-and-surfaces (test:demo-mode, test:asset-intent-query, test:presentation, test:mcp-natural-language, test:mcp-app-ui, test:mcp-enrichment): Demo and live read-only MCP research preserve supported intent, issuer identity, evidence and Chinese/English presentation across structured content and the native research component. Evidence: The live MCP regression exercises Chinese and English NVDA research, exact text/structured parity, two BNB representations, English labels and explicit no-trade follow-up suppression, with sideEffects none. Demo, presentation, bundled App and enrichment regressions cover local parity and safe provider-failure behavior.
  - execution-safety-regressions (test:domain, test:plan-registry, test:mcp-human-confirmation, test:mcp-confirmation-host-fixture, test:guarded-sdk-executor, test:input-balance, test:gas-safety, test:execution-dry-run, test:core-hardening, test:demo-mode): Research/Demo remain non-executing, and synthetic confirmation, plan, balance, gas, signing and broadcast safeguards retain their fail-closed behavior. Evidence: Domain, registry, synthetic MCP confirmation, guarded executor, balance/gas, offline rehearsal and Demo tests exercise declined, malformed, changed, expired, replayed and rejected plans. Tests use synthetic data and assert no real wallet; the offline rehearsal asserts zero broadcast requests, and executor broadcasting is exercised only through a mock callback.
  - reports-and-phase-ledger-reconciled (test:core-product-phase-plan, test:jev-shadow, test:distribution, test:mcp-config): The phase plan, phase-state ledger, Jev history, developer log, interim reports and deferred register agree on completed work, evidence class, remaining limitations and the terminal local state. Evidence: The phase-plan regression reads and cross-checks the phase-state ledger, Jev records and per-criterion scores, developer log, technical/product reports, deferred register, and six-area completion matrix. It verifies the prior Phase 23 review's 24 passed checks, required selected tests, false external-write/high-risk request flags, and correct hold/terminal transition behavior.
  - bounded-terminal-delivery-scope (test:core-product-phase-plan, test:distribution, test:jev-shadow, test:guarded-sdk-executor, test:execution-dry-run): Completion is recorded only as local SDK/MCP validation; no website work, commit/push, registry/public release, deployment, real-wallet signing, broadcast or funded settlement is claimed or performed during this Phase 23 review. Evidence: The selected set contains only local build/tests, read-only MCP calls and synthetic safety fixtures: pack:check is a dry-run and cleanroom removes its temporary consumer. The phase-plan test verifies the prior gate records externalWriteRequested=false and highRiskActionRequested=false, plus no transition beyond delivery-complete. No website/deployment, npm publish, Git push, real wallet, signature, network broadcast or funded settlement command is selected.
- Jev confidence by review item: status=0.990, nextAction=0.970, riskLevel=0.980, criterion_independent-sdk-package-consumption=1.000, criterion_mcp-research-journey-and-surfaces=0.930, criterion_execution-safety-regressions=0.990, criterion_reports-and-phase-ledger-reconciled=0.900, criterion_bounded-terminal-delivery-scope=0.920, deferredScope=1.000
- Jev criterion findings: Criterion independent-sdk-package-consumption: met (1.000 confidence) — The SDK builds and the documented package can be consumed from an isolated local artifact with runtime imports, declarations, examples and package metadata intact, without publication.; Criterion mcp-research-journey-and-surfaces: met (0.930 confidence) — Demo and live read-only MCP research preserve supported intent, issuer identity, evidence and Chinese/English presentation across structured content and the native research component.; Criterion execution-safety-regressions: met (0.990 confidence) — Research/Demo remain non-executing, and synthetic confirmation, plan, balance, gas, signing and broadcast safeguards retain their fail-closed behavior.; Criterion reports-and-phase-ledger-reconciled: met (0.900 confidence) — The phase plan, phase-state ledger, Jev history, developer log, interim reports and deferred register agree on completed work, evidence class, remaining limitations and the terminal local state.; Criterion bounded-terminal-delivery-scope: met (0.920 confidence) — Completion is recorded only as local SDK/MCP validation; no website work, commit/push, registry/public release, deployment, real-wallet signing, broadcast or funded settlement is claimed or performed during this Phase 23 review.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T00:14:16.477Z
- Phase: `developer-path-onboarding`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.650`
- Agreement: `true`
- Latency: `1471 ms`
- Phase transition: `pause`
- Transition reason: Criterion dual-path-setup lacks a sufficiently confident Jev review (0.650); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - dual-path-setup (test:onboarding, test:core-product-phase-plan): A developer can distinguish the independent TypeScript SDK path from the MCP-in-an-existing-Agent path and follow the credential-free Demo setup without confusing it with Live Mode. Evidence: The onboarding contract checks the documented SDK and MCP routes, Node prerequisite, clone/install steps, Demo configuration generation and host-dependent natural-language tool selection.
  - mcp-config-safety (test:mcp-config, test:distribution, test:onboarding): Demo and Live MCP client configurations match their intended launch commands and do not embed credentials. Evidence: Configuration regressions compare the Demo and Live server arguments and assert neither checked-in configuration contains an API secret.
  - standalone-sdk-consumer (test:sdk-example, test:cleanroom, pack:check): The documented standalone package entry can be built and consumed outside the source checkout, with runtime imports, declarations and the search-to-market-context journey verified. Evidence: The clean-room test installs a fresh local tarball into a disposable consumer, runs a signed-header synthetic search and market-context request, and checks types and root exports; pack:check is a dry run only.
  - safety-and-claims (test:onboarding, test:distribution, test:core-product-phase-plan): Documentation keeps approval, external signing and broadcast boundaries explicit and does not claim universal Agent tool selection or public package release. Evidence: Documentation assertions check host-dependent tool selection, integrator-owned approval and local-only distribution boundaries; no publish or deploy command is part of the selected checks.
- Jev confidence by review item: status=0.980, nextAction=0.980, riskLevel=1.000, criterion_dual-path-setup=0.650, criterion_mcp-config-safety=0.910, criterion_standalone-sdk-consumer=0.950, criterion_safety-and-claims=0.900, deferredScope=1.000
- Jev criterion findings: Criterion dual-path-setup: met (0.650 confidence) — A developer can distinguish the independent TypeScript SDK path from the MCP-in-an-existing-Agent path and follow the credential-free Demo setup without confusing it with Live Mode.; Criterion mcp-config-safety: met (0.910 confidence) — Demo and Live MCP client configurations match their intended launch commands and do not embed credentials.; Criterion standalone-sdk-consumer: met (0.950 confidence) — The documented standalone package entry can be built and consumed outside the source checkout, with runtime imports, declarations and the search-to-market-context journey verified.; Criterion safety-and-claims: met (0.900 confidence) — Documentation keeps approval, external signing and broadcast boundaries explicit and does not claim universal Agent tool selection or public package release.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T00:16:02.583Z
- Phase: `developer-path-onboarding`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.440`
- Agreement: `true`
- Latency: `1682 ms`
- Phase transition: `pause`
- Transition reason: Criterion safety-and-release-claims lacks a sufficiently confident Jev review (0.440); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - standalone-sdk-consumer (test:sdk-example, test:cleanroom, pack:check): The standalone TypeScript SDK instructions lead to a package that can be built and consumed outside the source checkout, including its documented search-to-market-context journey. Evidence: The documented example source is checked; a dry-run tarball is built; and a fresh-cache disposable consumer installs it, imports runtime/types/root exports, then makes a loopback-synthetic signed search and market-context request.
  - agent-mcp-demo-path (test:onboarding, test:mcp-config, test:mcp-app-ui, test:demo-mode): The Quickstart shows how to generate a credential-free MCP Demo configuration for an existing Agent and invoke the supported research journey without requiring the user to name a tool when the host supports automatic selection. Evidence: The onboarding and config tests assert the generated Demo command and host-dependent tool-selection wording; the stdio UI test discovers and renders the shared MCP Apps resource from Demo tools; Demo fixtures assert deterministic research and action blocking.
  - demo-live-boundary (test:onboarding, test:distribution, test:mcp-config): Demo and Live Mode instructions and configurations are distinct, and Live API credentials are user-provided locally rather than embedded in checked-in configuration. Evidence: The docs test checks Demo and Live instructions; distribution assertions compare both config fixtures and verify neither includes the secret variable or value.
  - safety-and-release-claims (test:onboarding, test:core-product-phase-plan): SDK/MCP instructions accurately state approval, external signing and broadcast limits and make no claim that npm, MCP Registry or Hosted MCP is already released. Evidence: The onboarding assertions check integrator-owned SDK approval and non-universal Agent selection; phase-plan assertions preserve the no-publish, no-deployment and no-wallet continuation boundary.
- Jev confidence by review item: status=0.980, nextAction=0.990, riskLevel=1.000, criterion_standalone-sdk-consumer=0.970, criterion_agent-mcp-demo-path=0.880, criterion_demo-live-boundary=0.910, criterion_safety-and-release-claims=0.440, deferredScope=1.000
- Jev criterion findings: Criterion standalone-sdk-consumer: met (0.970 confidence) — The standalone TypeScript SDK instructions lead to a package that can be built and consumed outside the source checkout, including its documented search-to-market-context journey.; Criterion agent-mcp-demo-path: met (0.880 confidence) — The Quickstart shows how to generate a credential-free MCP Demo configuration for an existing Agent and invoke the supported research journey without requiring the user to name a tool when the host supports automatic selection.; Criterion demo-live-boundary: met (0.910 confidence) — Demo and Live Mode instructions and configurations are distinct, and Live API credentials are user-provided locally rather than embedded in checked-in configuration.; Criterion safety-and-release-claims: met (0.440 confidence) — SDK/MCP instructions accurately state approval, external signing and broadcast limits and make no claim that npm, MCP Registry or Hosted MCP is already released.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T00:18:37.154Z
- Phase: `developer-path-onboarding`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.870`
- Agreement: `true`
- Latency: `937 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - standalone-sdk-consumer (test:sdk-example, test:cleanroom, pack:check): The standalone SDK can be built and consumed outside the source checkout, including its documented search-to-market-context journey. Evidence: The example source is checked; a dry-run tarball is built; and a fresh-cache consumer installs it, imports runtime/types/root exports, then performs a loopback-synthetic signed search and market-context request.
  - agent-mcp-demo-path (test:onboarding, test:mcp-config, test:mcp-app-ui, test:demo-mode): The Quickstart explains how to connect the credential-free MCP Demo to an existing Agent and use its read-only research journey, while accurately qualifying host-dependent automatic tool selection. Evidence: The docs/config tests assert generated Demo launch parameters and truthful tool-selection language; the stdio UI harness discovers and renders the resource; Demo tests verify issuer-aware research and blocked execution.
  - demo-live-boundary (test:onboarding, test:distribution, test:mcp-config): Demo and Live setup are distinct, with local user credentials absent from checked-in client configurations. Evidence: The onboarding test checks separate Demo/Live instructions and local .env guidance; config tests assert the expected distinct launch commands and no credential values.
  - user-approval-signing-boundary (test:onboarding, test:mcp-human-confirmation, test:guarded-sdk-executor, test:execution-dry-run): MCP requires an explicit host approval choice for the exact simulated plan; SDK integrations provide their own user approval UI; any signing remains external and Ariadne does not claim an actual human action from Agent text alone. Evidence: Documentation assertions state integrator responsibility; synthetic MCP tests cover exact approve/decline/cancel and fail-closed continuation; SDK executor and offline rehearsal exercise signature checks without a real wallet or broadcast.
  - local-only-distribution (test:onboarding, test:distribution, pack:check, test:core-product-phase-plan): This phase verifies package readiness only and does not publish npm, create a registry entry, deploy Hosted MCP or claim those surfaces are released. Evidence: The selected package command is an npm pack dry run; config/documentation and phase-plan regressions preserve the no-publication/deployment boundary, and the gate records no external write request.
- Jev confidence by review item: status=0.980, nextAction=0.990, riskLevel=1.000, criterion_standalone-sdk-consumer=0.900, criterion_agent-mcp-demo-path=0.870, criterion_demo-live-boundary=0.950, criterion_user-approval-signing-boundary=0.940, criterion_local-only-distribution=0.880, deferredScope=1.000
- Jev criterion findings: Criterion standalone-sdk-consumer: met (0.900 confidence) — The standalone SDK can be built and consumed outside the source checkout, including its documented search-to-market-context journey.; Criterion agent-mcp-demo-path: met (0.870 confidence) — The Quickstart explains how to connect the credential-free MCP Demo to an existing Agent and use its read-only research journey, while accurately qualifying host-dependent automatic tool selection.; Criterion demo-live-boundary: met (0.950 confidence) — Demo and Live setup are distinct, with local user credentials absent from checked-in client configurations.; Criterion user-approval-signing-boundary: met (0.940 confidence) — MCP requires an explicit host approval choice for the exact simulated plan; SDK integrations provide their own user approval UI; any signing remains external and Ariadne does not claim an actual human action from Agent text alone.; Criterion local-only-distribution: met (0.880 confidence) — This phase verifies package readiness only and does not publish npm, create a registry entry, deploy Hosted MCP or claim those surfaces are released.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T00:25:38.863Z
- Phase: `mcp-native-ui-host-review`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.930`
- Agreement: `true`
- Latency: `1518 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - shared-native-research-surface (test:mcp-app-ui, test:presentation): Discovery, comparison and one-call research expose the same compact read-only MCP Apps resource, while text and structured results preserve matching research evidence. Evidence: The stdio MCP client discovers one shared ui:// resource for all three research tools, executes the bundled client handshake, renders host-delivered structured and text-only results, and compares exact identities/evidence across tools and text/structured payloads.
  - host-adaptation-and-accessibility (test:mcp-app-ui): The research component adapts to host theme, style tokens, fonts and safe-area insets, and retains compact responsive and accessible disclosure behavior. Evidence: The deterministic runtime harness verifies host light/dark updates, custom font and tokens, all four safe-area insets, narrow-layout and reduced-motion CSS, visible keyboard focus styling, and native main/section/article plus details/summary semantics.
  - evidence-fidelity-and-research-safety (test:presentation, test:demo-mode, test:mcp-app-ui): The native result preserves source, timestamps, missing/unknown values and caveats without unsafe markup, fabricated data or wallet/trading affordances. Evidence: Bilingual regressions preserve distinct values, provenance, timestamps and missing-data warnings; Demo marks synthetic data and blocks actions; the executed bundle escapes hostile content and contains no wallet/trade controls.
  - host-observation-honesty-and-phase-scope (test:core-product-phase-plan, test:mcp-app-ui): Reports distinguish prior user confirmation of Codex visibility, the current connected tool read-only result, deterministic harness evidence, and unverified screenshot/cross-host rendering; the phase remains within approved local research UI scope. Evidence: The plan/log record the prior user observation separately from the fresh nested tool response and protocol harness, explicitly make no screenshot or universal-host claim, and retain website, deployment, trading and external-write exclusions.
- Jev confidence by review item: status=0.990, nextAction=0.950, riskLevel=1.000, criterion_shared-native-research-surface=0.990, criterion_host-adaptation-and-accessibility=1.000, criterion_evidence-fidelity-and-research-safety=1.000, criterion_host-observation-honesty-and-phase-scope=0.930, deferredScope=0.990
- Jev criterion findings: Criterion shared-native-research-surface: met (0.990 confidence) — Discovery, comparison and one-call research expose the same compact read-only MCP Apps resource, while text and structured results preserve matching research evidence.; Criterion host-adaptation-and-accessibility: met (1.000 confidence) — The research component adapts to host theme, style tokens, fonts and safe-area insets, and retains compact responsive and accessible disclosure behavior.; Criterion evidence-fidelity-and-research-safety: met (1.000 confidence) — The native result preserves source, timestamps, missing/unknown values and caveats without unsafe markup, fabricated data or wallet/trading affordances.; Criterion host-observation-honesty-and-phase-scope: met (0.930 confidence) — Reports distinguish prior user confirmation of Codex visibility, the current connected tool read-only result, deterministic harness evidence, and unverified screenshot/cross-host rendering; the phase remains within approved local research UI scope.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T00:42:25.351Z
- Phase: `provider-data-limitations-closure`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.930`
- Agreement: `true`
- Latency: `917 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - sdk-freshness-contract (typecheck, test:domain, test:presentation): SDK and Agent-facing market context disclose that provider timestamps alone do not guarantee fresh data and that no market-data freshness SLA has been verified. Evidence: Domain tests assert the normalized SDK warning; bilingual presentation tests verify the warning appears in English and Chinese cards, briefs and native research views while provider response and asset timestamps remain distinct.
  - catalog-scope-disclosure (test:mcp-app-ui, test:demo-mode, test:core-product-phase-plan): Live MCP research describes provider results as returned matches rather than a verified complete catalog, and Demo Mode identifies its limited synthetic sample in tool metadata, outputs and native UI. Evidence: MCP App tests inspect all three research tool descriptions and render English/Chinese catalog caveats; Demo MCP tests assert the actual warning and native result; phase-plan assertions reconcile the disclosure in source and developer docs.
  - missing-data-fidelity (test:asset-intent-query, test:mcp-enrichment, test:presentation, test:demo-mode): The local changes preserve asset identity and do not turn absent liquidity, timestamps or unknown market status into fabricated positive values. Evidence: Intent/enrichment regressions check identity-bound matching and fail-closed provider gaps; presentation/Demo checks preserve missing liquidity as absent, unknown status as unknown, and synthetic versus live data distinctions.
  - provider-observation-and-terminal-scope (test:core-product-phase-plan, test:mcp-enrichment): The six-call provider observation and unresolved 545-versus-488 inventory difference are recorded as bounded evidence, and terminal advancement remains local-only with no external write or high-risk action. Evidence: The phase-plan regression checks the dated six-request summary, mismatch, omitted fields, local-only phase boundary and current Jev ledger; the enrichment regression verifies identity-bound provider data and safe failure handling.
- Jev confidence by review item: status=0.990, nextAction=0.970, riskLevel=0.950, criterion_sdk-freshness-contract=0.990, criterion_catalog-scope-disclosure=0.990, criterion_missing-data-fidelity=0.970, criterion_provider-observation-and-terminal-scope=0.930, deferredScope=0.970
- Jev criterion findings: Criterion sdk-freshness-contract: met (0.990 confidence) — SDK and Agent-facing market context disclose that provider timestamps alone do not guarantee fresh data and that no market-data freshness SLA has been verified.; Criterion catalog-scope-disclosure: met (0.990 confidence) — Live MCP research describes provider results as returned matches rather than a verified complete catalog, and Demo Mode identifies its limited synthetic sample in tool metadata, outputs and native UI.; Criterion missing-data-fidelity: met (0.970 confidence) — The local changes preserve asset identity and do not turn absent liquidity, timestamps or unknown market status into fabricated positive values.; Criterion provider-observation-and-terminal-scope: met (0.930 confidence) — The six-call provider observation and unresolved 545-versus-488 inventory difference are recorded as bounded evidence, and terminal advancement remains local-only with no external write or high-risk action.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T00:48:15.953Z
- Phase: `provider-data-limitations-closure`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.820`
- Agreement: `true`
- Latency: `1383 ms`
- Phase transition: `pause`
- Transition reason: Criterion provider-observation-and-terminal-scope lacks a sufficiently confident Jev review (0.820); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-freshness-contract (typecheck, test:domain, test:presentation): SDK and Agent-facing market context disclose that provider timestamps alone do not guarantee fresh data and that no market-data freshness SLA has been verified. Evidence: Domain tests assert the normalized SDK warning; bilingual presentation tests verify it in English and Chinese cards, briefs and native views, while response and asset timestamps remain distinct.
  - catalog-scope-disclosure (test:domain, test:mcp-app-ui, test:demo-mode, test:core-product-phase-plan): Standalone SDK catalog snapshots expose runtime incomplete-catalog warnings; Live MCP labels returned matches as non-exhaustive; Demo SDK/MCP surfaces identify their limited synthetic sample. Evidence: Domain and Demo tests assert the actual Live/Demo snapshot warnings; MCP App tests check all research tool descriptions and bilingual native-view caveats; Demo MCP checks runtime warning delivery; plan regression checks the implementation and documentation contract.
  - missing-data-fidelity (test:asset-intent-query, test:mcp-enrichment, test:presentation, test:demo-mode): The local changes preserve asset identity and do not turn absent liquidity, timestamps or unknown market status into fabricated positive values. Evidence: Intent/enrichment regressions check identity-bound matching and fail-closed provider gaps; presentation/Demo checks preserve missing liquidity as absent, unknown status as unknown, and synthetic versus live data distinctions.
  - provider-observation-and-terminal-scope (test:core-product-phase-plan, test:mcp-enrichment): The six-call provider observation and unresolved 545-versus-488 inventory difference are recorded as bounded evidence, and terminal advancement remains local-only with no external write or high-risk action. Evidence: The phase-plan regression checks the dated six-request summary, discrepancy, omitted fields, local-only phase boundary and review ledger; enrichment checks identity-bound provider data and safe failure handling.
- Jev confidence by review item: status=0.990, nextAction=0.900, riskLevel=0.850, criterion_sdk-freshness-contract=0.960, criterion_catalog-scope-disclosure=0.880, criterion_missing-data-fidelity=0.940, criterion_provider-observation-and-terminal-scope=0.820, deferredScope=0.920
- Jev criterion findings: Criterion sdk-freshness-contract: met (0.960 confidence) — SDK and Agent-facing market context disclose that provider timestamps alone do not guarantee fresh data and that no market-data freshness SLA has been verified.; Criterion catalog-scope-disclosure: met (0.880 confidence) — Standalone SDK catalog snapshots expose runtime incomplete-catalog warnings; Live MCP labels returned matches as non-exhaustive; Demo SDK/MCP surfaces identify their limited synthetic sample.; Criterion missing-data-fidelity: met (0.940 confidence) — The local changes preserve asset identity and do not turn absent liquidity, timestamps or unknown market status into fabricated positive values.; Criterion provider-observation-and-terminal-scope: met (0.820 confidence) — The six-call provider observation and unresolved 545-versus-488 inventory difference are recorded as bounded evidence, and terminal advancement remains local-only with no external write or high-risk action.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T00:52:36.635Z
- Phase: `provider-data-limitations-closure`
- Jev provider: `native-jev`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: `needs_rework` / `repair` / risk `low` / confidence `0.300`
- Agreement: `true`
- Latency: `1279 ms`
- Phase transition: `pause`
- Transition reason: Criterion sdk-freshness-contract lacks a sufficiently confident Jev review (0.300); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-freshness-contract (typecheck, test:domain, test:presentation): SDK and Agent-facing market context disclose that provider timestamps alone do not guarantee fresh data and no freshness SLA is verified. Evidence: SDK normalizer regression verifies the runtime warning; bilingual SDK/MCP card and brief fixtures verify the warning while keeping provider response and asset update timestamps distinct.
  - catalog-scope-disclosure (test:domain, test:mcp-app-ui, test:demo-mode, test:core-product-phase-plan): Live SDK snapshots and Live MCP discovery/research identify returned rows as non-exhaustive; Demo SDK/MCP results disclose their limited synthetic sample in runtime/UI output. Evidence: Domain and Demo checks inspect actual SDK snapshot warnings; MCP App checks tool descriptions and English/Chinese native-card caveats; Demo tests inspect result output and rendering; plan regression checks docs and source contract.
  - missing-data-fidelity (test:asset-intent-query, test:mcp-enrichment, test:presentation, test:demo-mode): Asset identity is preserved and absent liquidity, timestamps and unknown statuses remain unknown rather than becoming fabricated values. Evidence: Intent and enrichment tests cover identity matching and fail-closed behavior; bilingual presentation and Demo tests assert absent liquidity is not zero and unknown status is not promoted.
  - bounded-observation-integrity (test:core-product-phase-plan): A sanitized, structured record accurately captures the authorized six serial GET observations, per-request success, 545/488 counts, 57 difference and field/status observations without secrets or raw provider data. Evidence: The plan regression parses records/phase26-provider-observation.json and asserts its six request rows, HTTP 200 statuses, zero retries, timeout, aggregate counts, missing fields, sample ages, and absence of raw payloads/credentials.
  - explicit-upstream-limitations (test:core-product-phase-plan): The record and user-facing docs explicitly leave pagination/count semantics, catalog completeness, missing directory fields and acceptable price freshness unresolved; no cause is inferred. Evidence: The machine-readable observation carries five unresolved limitations, while Quickstart, SDK usage, deferred items, phase plan and interim reports distinguish sample counts from completeness and timestamps from freshness guarantees.
  - terminal-local-scope (test:core-product-phase-plan, test:mcp-app-ui, test:demo-mode): Phase 26 ends only at local delivery and does not authorize or perform website edits, publication, deployment, payments, wallet signing or transaction broadcast. Evidence: Phase-plan state and scope regression retain terminal delivery and no-write/high-risk boundaries; native UI and Demo execution checks retain research-only/blocked action behavior; gate evidence records no external write/high-risk request.
- Jev confidence by review item: status=0.770, nextAction=0.850, riskLevel=0.690, criterion_sdk-freshness-contract=0.300, criterion_catalog-scope-disclosure=0.920, criterion_missing-data-fidelity=0.950, criterion_bounded-observation-integrity=0.970, criterion_explicit-upstream-limitations=0.930, criterion_terminal-local-scope=0.960, deferredScope=0.910
- Jev criterion findings: Criterion sdk-freshness-contract: met (0.300 confidence) — SDK and Agent-facing market context disclose that provider timestamps alone do not guarantee fresh data and no freshness SLA is verified.; Criterion catalog-scope-disclosure: met (0.920 confidence) — Live SDK snapshots and Live MCP discovery/research identify returned rows as non-exhaustive; Demo SDK/MCP results disclose their limited synthetic sample in runtime/UI output.; Criterion missing-data-fidelity: met (0.950 confidence) — Asset identity is preserved and absent liquidity, timestamps and unknown statuses remain unknown rather than becoming fabricated values.; Criterion bounded-observation-integrity: met (0.970 confidence) — A sanitized, structured record accurately captures the authorized six serial GET observations, per-request success, 545/488 counts, 57 difference and field/status observations without secrets or raw provider data.; Criterion explicit-upstream-limitations: met (0.930 confidence) — The record and user-facing docs explicitly leave pagination/count semantics, catalog completeness, missing directory fields and acceptable price freshness unresolved; no cause is inferred.; Criterion terminal-local-scope: met (0.960 confidence) — Phase 26 ends only at local delivery and does not authorize or perform website edits, publication, deployment, payments, wallet signing or transaction broadcast.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T00:59:29.010Z
- Phase: `provider-data-limitations-closure`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.830`
- Agreement: `true`
- Latency: `1757 ms`
- Phase transition: `pause`
- Transition reason: Criterion catalog-scope-disclosure lacks a sufficiently confident Jev review (0.830); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-freshness-contract (typecheck, test:domain): SDK MarketContext preserves the per-asset quote timestamp separately from the endpoint response timestamp and always states that a provider timestamp does not guarantee freshness or a freshness SLA. Evidence: The SDK regression checks exactly one runtime caveat, separate API-response and per-asset timestamps, and the same caveat when the per-asset timestamp is either present or absent.
  - agent-facing-freshness-copy (test:presentation, test:mcp-app-ui): English and Chinese Agent-facing cards, research briefs and native MCP views display the freshness caveat without dropping source/timestamp context. Evidence: Presentation assertions inspect the precise localized warning in English/Chinese cards and briefs; the executed MCP App test inspects it in both native views and retains source and timestamp fields.
  - catalog-scope-disclosure (test:domain, test:mcp-app-ui, test:demo-mode, test:core-product-phase-plan): Live SDK/MCP results are described as returned matches rather than a verified complete catalog, while Demo surfaces identify their limited synthetic sample. Evidence: Domain/Demo regressions inspect runtime snapshot warnings; MCP App checks research descriptions and localized UI caveats; Demo checks actual result disclosure; the phase-plan test reconciles docs, code and scope.
  - missing-data-fidelity (test:asset-intent-query, test:mcp-enrichment, test:presentation, test:demo-mode): Asset identity is preserved and absent liquidity, timestamps and unknown market statuses remain unknown rather than being converted into positive or zero values. Evidence: Identity/enrichment checks cover exact matching and fail-closed gaps; English/Chinese presentation and Demo assertions preserve absent fields, unknown status and synthetic-versus-live boundaries.
  - bounded-observation-integrity (test:core-product-phase-plan): The sanitized evidence record accurately captures the one authorized six-request serial GET sample, returned counts, difference, field/status observations and timestamp ages without credentials or raw payloads. Evidence: The plan regression parses the structured record and asserts six successful requests, zero retries, timeout, aggregate counts and status/field data, timestamp-age samples, and explicit omission of provider payloads and credentials.
  - explicit-upstream-limitations (test:core-product-phase-plan): The cause of the observed catalog-count difference, pagination semantics, missing directory fields and any acceptable freshness SLA remain explicitly unresolved without causal speculation. Evidence: The structured record has five open limitations; Quickstart, SDK usage, deferred items, plan and reports consistently distinguish one-time counts and timestamps from completeness or freshness guarantees.
  - terminal-local-scope (test:core-product-phase-plan, test:mcp-app-ui, test:demo-mode): Phase 26 ends at local delivery only; no website edit, publication, deployment, paid service, signing or broadcast is authorized or performed. Evidence: The phase-plan and Jev ledger assert local terminal state and no-write/high-risk flags; MCP UI and Demo retain research-only and disabled-action behavior.
- Jev confidence by review item: status=0.980, nextAction=0.970, riskLevel=0.990, criterion_sdk-freshness-contract=0.920, criterion_agent-facing-freshness-copy=0.980, criterion_catalog-scope-disclosure=0.830, criterion_missing-data-fidelity=0.930, criterion_bounded-observation-integrity=0.980, criterion_explicit-upstream-limitations=0.860, criterion_terminal-local-scope=0.960, deferredScope=0.920
- Jev criterion findings: Criterion sdk-freshness-contract: met (0.920 confidence) — SDK MarketContext preserves the per-asset quote timestamp separately from the endpoint response timestamp and always states that a provider timestamp does not guarantee freshness or a freshness SLA.; Criterion agent-facing-freshness-copy: met (0.980 confidence) — English and Chinese Agent-facing cards, research briefs and native MCP views display the freshness caveat without dropping source/timestamp context.; Criterion catalog-scope-disclosure: met (0.830 confidence) — Live SDK/MCP results are described as returned matches rather than a verified complete catalog, while Demo surfaces identify their limited synthetic sample.; Criterion missing-data-fidelity: met (0.930 confidence) — Asset identity is preserved and absent liquidity, timestamps and unknown market statuses remain unknown rather than being converted into positive or zero values.; Criterion bounded-observation-integrity: met (0.980 confidence) — The sanitized evidence record accurately captures the one authorized six-request serial GET sample, returned counts, difference, field/status observations and timestamp ages without credentials or raw payloads.; Criterion explicit-upstream-limitations: met (0.860 confidence) — The cause of the observed catalog-count difference, pagination semantics, missing directory fields and any acceptable freshness SLA remain explicitly unresolved without causal speculation.; Criterion terminal-local-scope: met (0.960 confidence) — Phase 26 ends at local delivery only; no website edit, publication, deployment, paid service, signing or broadcast is authorized or performed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T01:02:27.538Z
- Phase: `provider-data-limitations-closure`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.810`
- Agreement: `true`
- Latency: `2826 ms`
- Phase transition: `pause`
- Transition reason: Criterion explicit-upstream-limitations lacks a sufficiently confident Jev review (0.810); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-freshness-contract (typecheck, test:domain): SDK MarketContext preserves the per-asset quote timestamp separately from the endpoint response timestamp and always states that a provider timestamp does not guarantee freshness or a freshness SLA. Evidence: The SDK regression checks exactly one runtime caveat, separate API-response and per-asset timestamps, and the same caveat when the per-asset timestamp is either present or absent.
  - agent-facing-freshness-copy (test:presentation, test:mcp-app-ui): English and Chinese Agent-facing cards, research briefs and native MCP views display the freshness caveat without dropping source/timestamp context. Evidence: Presentation assertions inspect the precise localized warning in English/Chinese cards and briefs; the executed MCP App test inspects it in both native views and retains source and timestamp fields.
  - sdk-catalog-scope-warning (test:domain): A standalone Live SDK directory snapshot returns the explicit runtime warning that the provider result is not a verified complete catalog. Evidence: The SDK domain regression calls listSnapshot and asserts that its returned warnings array exactly contains the documented Live catalog-scope warning.
  - live-mcp-catalog-scope-copy (test:mcp-app-ui, test:core-product-phase-plan): All three MCP research tools describe returned matches as non-exhaustive, and the native research view renders the Live caveat in English and Chinese. Evidence: The MCP App integration enumerates all three tools and checks their description wording, then renders the explicit Live catalog warning in English and Chinese; the phase-plan test reconciles the mode-dependent server warning contract.
  - demo-catalog-scope-warning (test:demo-mode, test:mcp-app-ui): Demo SDK, MCP result and native research card identify the fixtures as a limited synthetic sample, not a complete live catalog. Evidence: Demo tests assert the exact SDK snapshot warning, actual MCP outcome warning and rendered native-card warning; the MCP App test checks the localized Demo caveat.
  - missing-data-fidelity (test:asset-intent-query, test:mcp-enrichment, test:presentation, test:demo-mode): Asset identity is preserved and absent liquidity, timestamps and unknown market statuses remain unknown rather than being converted into positive or zero values. Evidence: Identity/enrichment checks cover exact matching and fail-closed gaps; English/Chinese presentation and Demo assertions preserve absent fields, unknown status and synthetic-versus-live boundaries.
  - bounded-observation-integrity (test:core-product-phase-plan): The sanitized evidence record accurately captures the one authorized six-request serial GET sample, returned counts, difference, field/status observations and timestamp ages without credentials or raw payloads. Evidence: The plan regression parses the structured record and asserts six successful requests, zero retries, timeout, aggregate counts and status/field data, timestamp-age samples, and explicit omission of provider payloads and credentials.
  - explicit-upstream-limitations (test:core-product-phase-plan): The cause of the observed catalog-count difference, pagination semantics, missing directory fields and any acceptable freshness SLA remain explicitly unresolved without causal speculation. Evidence: The structured record has five open limitations; Quickstart, SDK usage, deferred items, plan and reports consistently distinguish one-time counts and timestamps from completeness or freshness guarantees.
  - terminal-local-scope (test:core-product-phase-plan, test:mcp-app-ui, test:demo-mode): Phase 26 ends at local delivery only; no website edit, publication, deployment, paid service, signing or broadcast is authorized or performed. Evidence: The phase-plan and Jev ledger assert local terminal state and no-write/high-risk flags; MCP UI and Demo retain research-only and disabled-action behavior.
- Jev confidence by review item: status=0.970, nextAction=0.970, riskLevel=0.990, criterion_sdk-freshness-contract=0.890, criterion_agent-facing-freshness-copy=0.960, criterion_sdk-catalog-scope-warning=0.970, criterion_live-mcp-catalog-scope-copy=0.950, criterion_demo-catalog-scope-warning=0.940, criterion_missing-data-fidelity=0.860, criterion_bounded-observation-integrity=0.970, criterion_explicit-upstream-limitations=0.810, criterion_terminal-local-scope=0.880, deferredScope=0.930
- Jev criterion findings: Criterion sdk-freshness-contract: met (0.890 confidence) — SDK MarketContext preserves the per-asset quote timestamp separately from the endpoint response timestamp and always states that a provider timestamp does not guarantee freshness or a freshness SLA.; Criterion agent-facing-freshness-copy: met (0.960 confidence) — English and Chinese Agent-facing cards, research briefs and native MCP views display the freshness caveat without dropping source/timestamp context.; Criterion sdk-catalog-scope-warning: met (0.970 confidence) — A standalone Live SDK directory snapshot returns the explicit runtime warning that the provider result is not a verified complete catalog.; Criterion live-mcp-catalog-scope-copy: met (0.950 confidence) — All three MCP research tools describe returned matches as non-exhaustive, and the native research view renders the Live caveat in English and Chinese.; Criterion demo-catalog-scope-warning: met (0.940 confidence) — Demo SDK, MCP result and native research card identify the fixtures as a limited synthetic sample, not a complete live catalog.; Criterion missing-data-fidelity: met (0.860 confidence) — Asset identity is preserved and absent liquidity, timestamps and unknown market statuses remain unknown rather than being converted into positive or zero values.; Criterion bounded-observation-integrity: met (0.970 confidence) — The sanitized evidence record accurately captures the one authorized six-request serial GET sample, returned counts, difference, field/status observations and timestamp ages without credentials or raw payloads.; Criterion explicit-upstream-limitations: met (0.810 confidence) — The cause of the observed catalog-count difference, pagination semantics, missing directory fields and any acceptable freshness SLA remain explicitly unresolved without causal speculation.; Criterion terminal-local-scope: met (0.880 confidence) — Phase 26 ends at local delivery only; no website edit, publication, deployment, paid service, signing or broadcast is authorized or performed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T01:09:49.747Z
- Phase: `provider-data-limitations-closure`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.850`
- Agreement: `true`
- Latency: `1548 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - sdk-freshness-contract (typecheck, test:domain): SDK MarketContext preserves the per-asset quote timestamp separately from the endpoint response timestamp and states that timestamps do not guarantee freshness or a freshness SLA. Evidence: The SDK test requires exactly one runtime caveat, keeps response and per-asset timestamps distinct, and checks the caveat both with and without the asset timestamp.
  - agent-facing-freshness-copy (test:presentation, test:mcp-app-ui): English and Chinese Agent-facing cards, briefs and native MCP views display the freshness caveat without dropping source or timestamp context. Evidence: Presentation tests inspect the precise bilingual warning in cards and briefs; executed MCP App tests inspect both native views while retaining source and timestamp fields.
  - sdk-catalog-scope-warning (test:domain): A standalone Live SDK directory snapshot returns an explicit runtime warning that its provider results are not a verified complete catalog. Evidence: The domain regression calls listSnapshot and asserts its warnings array exactly contains the Live catalog-scope warning.
  - live-mcp-catalog-scope-copy (test:mcp-app-ui, test:core-product-phase-plan): All three MCP research tools describe results as returned matches, and the native research view renders the Live catalog caveat in English and Chinese. Evidence: The MCP integration enumerates all three tools and checks descriptions, then renders the explicit Live catalog caveat bilingually; phase-plan assertions verify mode-dependent server wording.
  - demo-catalog-scope-warning (test:demo-mode, test:mcp-app-ui): Demo SDK, MCP results and native research cards identify fixtures as a limited synthetic sample, not a complete live catalog. Evidence: Demo tests assert exact SDK snapshot, MCP outcome and native-card warnings; the MCP App harness checks localized Demo wording.
  - inventory-and-pagination-uncertainty (test:phase26-limitations): The 545 declared versus 488 returned count discrepancy remains unexplained; pagination and total-count semantics are not presented as verified. Evidence: A focused regression checks the exact counts and 57 difference in the sanitized record, verifies the limitation text, and checks Quickstart/SDK wording rejects complete-market or completeness-estimate interpretations.
  - tab-filter-semantics-uncertainty (test:phase26-limitations): Equal identity sets for the two sampled tab IDs are reported only as an observation and do not imply that filtering is ignored. Evidence: The focused regression checks the recorded equal identity sets, the explicit limitation against inferring ignored filtering, and phase-plan wording that filter semantics remain unestablished.
  - directory-fields-and-status-uncertainty (test:phase26-limitations, test:demo-mode): Missing directory timestamps, liquidity and recognized market statuses remain explicit unknowns and are not converted into invented values. Evidence: The limitation regression checks zero directory timestamps/liquidity, 46 missing statuses and recognized-status counts against the record/deferred text; Demo and presentation tests preserve missing values.
  - freshness-sla-uncertainty (test:phase26-limitations, test:domain, test:presentation): Two sampled quote ages are treated as observations only; no maximum acceptable quote age or provider freshness SLA is claimed. Evidence: The focused test checks the recorded 196/4426 ms ages and unresolved-SLA text; SDK and bilingual presentation regressions assert that timestamps do not establish freshness guarantees.
  - missing-data-fidelity (test:asset-intent-query, test:mcp-enrichment, test:presentation, test:demo-mode): Asset identity is preserved and absent liquidity, timestamps and unknown market statuses remain unknown instead of becoming positive or zero values. Evidence: Identity/enrichment checks cover exact matching and fail-closed gaps; presentation and Demo checks preserve absent fields, unknown status and synthetic-versus-live boundaries.
  - bounded-observation-integrity (test:core-product-phase-plan, test:phase26-limitations): The one authorized six-request serial GET sample is recorded accurately, bounded, and free of raw provider payloads or credentials. Evidence: The plan and focused limitation tests assert the timestamped six-request/zero-retry/timeout record, successful responses, sanitized aggregates, and explicit absence of raw payloads and credentials.
  - terminal-local-scope (test:core-product-phase-plan, test:mcp-app-ui, test:demo-mode): Phase 26 ends at local delivery only; no website edit, publication, deployment, paid service, signing or broadcast is authorized or performed. Evidence: The phase plan and Jev ledger require local terminal state and false write/high-risk flags; UI and Demo regressions preserve research-only and disabled-action behavior.
- Jev confidence by review item: status=0.980, nextAction=0.980, riskLevel=0.960, criterion_sdk-freshness-contract=0.950, criterion_agent-facing-freshness-copy=0.940, criterion_sdk-catalog-scope-warning=0.990, criterion_live-mcp-catalog-scope-copy=0.950, criterion_demo-catalog-scope-warning=0.850, criterion_inventory-and-pagination-uncertainty=0.980, criterion_tab-filter-semantics-uncertainty=0.930, criterion_directory-fields-and-status-uncertainty=0.890, criterion_freshness-sla-uncertainty=0.990, criterion_missing-data-fidelity=0.870, criterion_bounded-observation-integrity=0.970, criterion_terminal-local-scope=0.940, deferredScope=0.880
- Jev criterion findings: Criterion sdk-freshness-contract: met (0.950 confidence) — SDK MarketContext preserves the per-asset quote timestamp separately from the endpoint response timestamp and states that timestamps do not guarantee freshness or a freshness SLA.; Criterion agent-facing-freshness-copy: met (0.940 confidence) — English and Chinese Agent-facing cards, briefs and native MCP views display the freshness caveat without dropping source or timestamp context.; Criterion sdk-catalog-scope-warning: met (0.990 confidence) — A standalone Live SDK directory snapshot returns an explicit runtime warning that its provider results are not a verified complete catalog.; Criterion live-mcp-catalog-scope-copy: met (0.950 confidence) — All three MCP research tools describe results as returned matches, and the native research view renders the Live catalog caveat in English and Chinese.; Criterion demo-catalog-scope-warning: met (0.850 confidence) — Demo SDK, MCP results and native research cards identify fixtures as a limited synthetic sample, not a complete live catalog.; Criterion inventory-and-pagination-uncertainty: met (0.980 confidence) — The 545 declared versus 488 returned count discrepancy remains unexplained; pagination and total-count semantics are not presented as verified.; Criterion tab-filter-semantics-uncertainty: met (0.930 confidence) — Equal identity sets for the two sampled tab IDs are reported only as an observation and do not imply that filtering is ignored.; Criterion directory-fields-and-status-uncertainty: met (0.890 confidence) — Missing directory timestamps, liquidity and recognized market statuses remain explicit unknowns and are not converted into invented values.; Criterion freshness-sla-uncertainty: met (0.990 confidence) — Two sampled quote ages are treated as observations only; no maximum acceptable quote age or provider freshness SLA is claimed.; Criterion missing-data-fidelity: met (0.870 confidence) — Asset identity is preserved and absent liquidity, timestamps and unknown market statuses remain unknown instead of becoming positive or zero values.; Criterion bounded-observation-integrity: met (0.970 confidence) — The one authorized six-request serial GET sample is recorded accurately, bounded, and free of raw provider payloads or credentials.; Criterion terminal-local-scope: met (0.940 confidence) — Phase 26 ends at local delivery only; no website edit, publication, deployment, paid service, signing or broadcast is authorized or performed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T02:21:47.926Z
- Phase: `provider-data-limitations-closure`
- Jev provider: `native-jev`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: `needs_rework` / `repair` / risk `low` / confidence `0.190`
- Agreement: `true`
- Latency: `1889 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion live-mcp-catalog-scope-copy: gap — All MCP research tools and the native research view describe Live results as returned matches, not a verified complete catalog.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-freshness-contract (test:domain): SDK market context keeps provider response time distinct from per-asset quote time and always says timestamps do not establish freshness or an SLA. Evidence: The domain regression asserts the exact caveat with and without an asset timestamp and verifies response and per-asset timestamps remain distinct.
  - agent-facing-freshness-copy (test:presentation, test:mcp-app-ui): English and Chinese cards, briefs and native MCP views show freshness caveats while retaining source and timestamp context. Evidence: Presentation and executed MCP App checks inspect both locales and retain source/time fields.
  - sdk-catalog-scope-warning (test:domain, test:demo-mode, test:onboarding): Live SDK search matches and directory snapshots disclose that returned results are not a verified complete catalog; Demo SDK search and snapshots identify the limited synthetic sample. Evidence: Runtime tests assert Live search and snapshot warnings, Demo search and snapshot warnings, and the corresponding SDK guidance.
  - live-mcp-catalog-scope-copy (test:mcp-app-ui, test:core-product-phase-plan): All MCP research tools and the native research view describe Live results as returned matches, not a verified complete catalog. Evidence: MCP integration enumerates all three tools, checks their descriptions, and renders the localized Live caveat.
  - demo-catalog-scope-warning (test:demo-mode, test:mcp-app-ui): Demo SDK, MCP results and native research cards label fixtures as a limited synthetic sample, not a complete live catalog. Evidence: Demo tests assert SDK snapshot/search, MCP result and native card warnings; UI harness checks localized wording.
  - inventory-and-pagination-uncertainty (test:phase26-limitations): The 545 declared versus 488 returned difference remains unexplained; pagination and total-count semantics are not claimed as verified. Evidence: The limitation test reconciles safe recorded counts with documentation that rejects completeness interpretations.
  - tab-filter-semantics-uncertainty (test:phase26-limitations): Equal identity sets for two sampled tab IDs remain an observation and do not imply filtering is ignored. Evidence: The regression checks the sampled equality and explicit limitation against causal inference.
  - directory-fields-and-status-uncertainty (test:phase26-limitations, test:demo-mode): Missing directory timestamps, liquidity and recognized statuses remain unknown rather than receiving invented values. Evidence: The record regression checks omissions and counts; Demo checks preserve unknown status and absent liquidity.
  - freshness-sla-uncertainty (test:phase26-limitations, test:domain, test:presentation): The two sampled quote ages are observations only and establish neither an acceptable age nor a provider freshness SLA. Evidence: Tests check the bounded ages and wording that timestamps alone do not guarantee freshness.
  - missing-data-fidelity (test:asset-intent-query, test:mcp-enrichment, test:presentation, test:demo-mode): Asset identity is preserved and absent liquidity, timestamps and unknown market status are not converted into positive or zero values. Evidence: Identity/enrichment and bilingual presentation/Demo regressions cover missing fields and unknown values.
  - bounded-observation-integrity (test:core-product-phase-plan, test:phase26-limitations): The single six-request GET sample records safe query parameters and aggregation formulas, discloses omitted raw values that prevent full independent recomputation, and contains no credentials or raw provider payload. Evidence: Both regressions verify request bounds, query scope, calculation methodology, explicit recomputation limits, and absence of secrets/raw payloads.
  - terminal-local-scope (test:core-product-phase-plan, test:mcp-app-ui, test:demo-mode): Phase 26 remains local terminal delivery and does not authorize website edits, publication, deployment, wallet signing or broadcast. Evidence: Phase-plan and UI/Demo tests enforce the local-only and research-only boundary.
- Jev confidence by review item: status=0.690, nextAction=0.880, riskLevel=0.420, criterion_sdk-freshness-contract=0.990, criterion_agent-facing-freshness-copy=0.890, criterion_sdk-catalog-scope-warning=0.910, criterion_live-mcp-catalog-scope-copy=0.620, criterion_demo-catalog-scope-warning=0.890, criterion_inventory-and-pagination-uncertainty=0.840, criterion_tab-filter-semantics-uncertainty=0.850, criterion_directory-fields-and-status-uncertainty=0.950, criterion_freshness-sla-uncertainty=0.900, criterion_missing-data-fidelity=0.570, criterion_bounded-observation-integrity=0.230, criterion_terminal-local-scope=0.190, deferredScope=0.620
- Jev criterion findings: Criterion sdk-freshness-contract: met (0.990 confidence) — SDK market context keeps provider response time distinct from per-asset quote time and always says timestamps do not establish freshness or an SLA.; Criterion agent-facing-freshness-copy: met (0.890 confidence) — English and Chinese cards, briefs and native MCP views show freshness caveats while retaining source and timestamp context.; Criterion sdk-catalog-scope-warning: met (0.910 confidence) — Live SDK search matches and directory snapshots disclose that returned results are not a verified complete catalog; Demo SDK search and snapshots identify the limited synthetic sample.; Criterion live-mcp-catalog-scope-copy: gap (0.620 confidence) — All MCP research tools and the native research view describe Live results as returned matches, not a verified complete catalog.; Criterion demo-catalog-scope-warning: met (0.890 confidence) — Demo SDK, MCP results and native research cards label fixtures as a limited synthetic sample, not a complete live catalog.; Criterion inventory-and-pagination-uncertainty: met (0.840 confidence) — The 545 declared versus 488 returned difference remains unexplained; pagination and total-count semantics are not claimed as verified.; Criterion tab-filter-semantics-uncertainty: met (0.850 confidence) — Equal identity sets for two sampled tab IDs remain an observation and do not imply filtering is ignored.; Criterion directory-fields-and-status-uncertainty: met (0.950 confidence) — Missing directory timestamps, liquidity and recognized statuses remain unknown rather than receiving invented values.; Criterion freshness-sla-uncertainty: met (0.900 confidence) — The two sampled quote ages are observations only and establish neither an acceptable age nor a provider freshness SLA.; Criterion missing-data-fidelity: met (0.570 confidence) — Asset identity is preserved and absent liquidity, timestamps and unknown market status are not converted into positive or zero values.; Criterion bounded-observation-integrity: met (0.230 confidence) — The single six-request GET sample records safe query parameters and aggregation formulas, discloses omitted raw values that prevent full independent recomputation, and contains no credentials or raw provider payload.; Criterion terminal-local-scope: met (0.190 confidence) — Phase 26 remains local terminal delivery and does not authorize website edits, publication, deployment, wallet signing or broadcast.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T02:34:20.387Z
- Phase: `provider-data-limitations-closure`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.850`
- Agreement: `true`
- Latency: `1706 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - sdk-freshness-contract (test:domain): SDK market context distinguishes provider response timestamps from per-asset quote timestamps and states that timestamps do not establish data freshness or a freshness SLA. Evidence: The SDK domain regression asserts exact caveat presence with and without a per-asset timestamp and checks distinct response and quote timestamps.
  - agent-facing-freshness-copy (test:presentation, test:mcp-app-ui): English and Chinese Agent-facing cards, briefs, and the native MCP research view retain freshness caveats together with source and timestamp context. Evidence: Bilingual presentation contracts and the executed MCP App harness inspect warning copy and retain source/time evidence in rendered results.
  - sdk-catalog-scope-warning (test:domain, test:demo-mode, test:onboarding): Live SDK search matches and directory snapshots disclose that returned provider results are not a verified complete catalog; Demo results identify their limited synthetic sample. Evidence: Live/Demo SDK runtime assertions check search and snapshot warning fields; onboarding states the provider results are not a completeness guarantee.
  - live-mcp-catalog-scope-copy (test:mcp-app-ui, test:mcp-live-catalog-warning): All three Live MCP research tools disclose returned-match scope in tool metadata and actual results; the native research view renders the same warning. Evidence: A loopback-only synthetic provider launches the MCP server in Live mode; the test calls discovery, comparison and research, checks English/Chinese structured warnings, and renders the actual research result. The UI harness separately checks the shared native view resource.
  - demo-catalog-scope-warning (test:demo-mode, test:mcp-app-ui): Demo SDK/MCP responses and native research cards label fixtures as a limited synthetic sample, not a complete live catalog. Evidence: Demo integration assertions inspect actual SDK/MCP warning fields and the rendered card, including the limited-sample disclosure.
  - inventory-and-pagination-uncertainty (test:phase26-limitations): The 545 declared versus 488 returned representation observation remains unexplained; pagination and total-count semantics are not claimed as verified. Evidence: The focused regression reconciles the sanitized recorded counts with the documented unresolved cause and explicit no-completeness claim.
  - tab-filter-semantics-uncertainty (test:phase26-limitations): Equal identity sets observed for two sampled tab IDs are reported as an observation and do not establish that provider filtering is ignored. Evidence: The regression checks the sampled identity-set equality and the explicit limitation against inferring filter semantics.
  - directory-fields-and-status-uncertainty (test:phase26-limitations, test:domain): Missing directory timestamps/liquidity and unrecognized market statuses remain unknown rather than receiving invented values. Evidence: The observation regression checks missing-field counts/statuses; domain normalization tests preserve missing values and unknown states.
  - freshness-sla-uncertainty (test:phase26-limitations, test:domain, test:presentation): The sampled quote ages establish neither an acceptable maximum age nor a provider freshness SLA. Evidence: The evidence regression checks the two recorded quote-age observations and unresolved SLA; SDK and bilingual presentation checks explicitly reject a freshness guarantee.
  - missing-data-fidelity (test:asset-intent-query, test:mcp-enrichment, test:presentation, test:demo-mode): Asset identity is preserved, and absent liquidity/timestamps or unknown market status are not converted into positive or zero values. Evidence: Identity/enrichment regressions assert exact requested representations and fail-closed mismatches; presentation and Demo tests verify absent data and unknown states remain explicit.
  - bounded-observation-integrity (test:phase26-limitations, test:core-product-phase-plan): The single approved six-request serial GET sample records its safe query scope and aggregation methods, discloses limits on independent recomputation, and contains no raw provider payloads or credentials. Evidence: Both tests check the six-request/zero-retry observation, query parameters, aggregation definitions, recomputation limitation and absence of provider payloads/credentials.
  - terminal-local-scope (test:core-product-phase-plan, test:onboarding, test:jev-shadow): Phase 26's reviewed deliverable is local SDK/MCP evidence ending at its named terminal state; the Jev review itself does not authorize separate Git sync, publication, deployment, wallet signing or broadcast. Evidence: Phase-plan assertions bind Phase 26 to the local terminal state; onboarding and phase-gate regressions distinguish local validation from separate release authorization and verify failed reviews do not advance.
- Jev confidence by review item: status=0.920, nextAction=0.850, riskLevel=0.980, criterion_sdk-freshness-contract=0.990, criterion_agent-facing-freshness-copy=0.970, criterion_sdk-catalog-scope-warning=0.930, criterion_live-mcp-catalog-scope-copy=0.920, criterion_demo-catalog-scope-warning=0.960, criterion_inventory-and-pagination-uncertainty=0.910, criterion_tab-filter-semantics-uncertainty=0.920, criterion_directory-fields-and-status-uncertainty=0.960, criterion_freshness-sla-uncertainty=0.980, criterion_missing-data-fidelity=0.930, criterion_bounded-observation-integrity=0.970, criterion_terminal-local-scope=0.960
- Jev criterion findings: Criterion sdk-freshness-contract: met (0.990 confidence) — SDK market context distinguishes provider response timestamps from per-asset quote timestamps and states that timestamps do not establish data freshness or a freshness SLA.; Criterion agent-facing-freshness-copy: met (0.970 confidence) — English and Chinese Agent-facing cards, briefs, and the native MCP research view retain freshness caveats together with source and timestamp context.; Criterion sdk-catalog-scope-warning: met (0.930 confidence) — Live SDK search matches and directory snapshots disclose that returned provider results are not a verified complete catalog; Demo results identify their limited synthetic sample.; Criterion live-mcp-catalog-scope-copy: met (0.920 confidence) — All three Live MCP research tools disclose returned-match scope in tool metadata and actual results; the native research view renders the same warning.; Criterion demo-catalog-scope-warning: met (0.960 confidence) — Demo SDK/MCP responses and native research cards label fixtures as a limited synthetic sample, not a complete live catalog.; Criterion inventory-and-pagination-uncertainty: met (0.910 confidence) — The 545 declared versus 488 returned representation observation remains unexplained; pagination and total-count semantics are not claimed as verified.; Criterion tab-filter-semantics-uncertainty: met (0.920 confidence) — Equal identity sets observed for two sampled tab IDs are reported as an observation and do not establish that provider filtering is ignored.; Criterion directory-fields-and-status-uncertainty: met (0.960 confidence) — Missing directory timestamps/liquidity and unrecognized market statuses remain unknown rather than receiving invented values.; Criterion freshness-sla-uncertainty: met (0.980 confidence) — The sampled quote ages establish neither an acceptable maximum age nor a provider freshness SLA.; Criterion missing-data-fidelity: met (0.930 confidence) — Asset identity is preserved, and absent liquidity/timestamps or unknown market status are not converted into positive or zero values.; Criterion bounded-observation-integrity: met (0.970 confidence) — The single approved six-request serial GET sample records its safe query scope and aggregation methods, discloses limits on independent recomputation, and contains no raw provider payloads or credentials.; Criterion terminal-local-scope: met (0.960 confidence) — Phase 26's reviewed deliverable is local SDK/MCP evidence ending at its named terminal state; the Jev review itself does not authorize separate Git sync, publication, deployment, wallet signing or broadcast.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T02:38:42.588Z
- Phase: `provider-data-limitations-closure`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.910`
- Agreement: `true`
- Latency: `911 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - sdk-freshness-contract (test:domain): SDK market context distinguishes provider response timestamps from per-asset quote timestamps and states that timestamps do not establish data freshness or a freshness SLA. Evidence: The SDK domain regression asserts exact caveat presence with and without a per-asset timestamp and checks distinct response and quote timestamps.
  - agent-facing-freshness-copy (test:presentation, test:mcp-app-ui): English and Chinese Agent-facing cards, briefs, and the native MCP research view retain freshness caveats together with source and timestamp context. Evidence: Bilingual presentation contracts and the executed MCP App harness inspect warning copy and retain source/time evidence in rendered results.
  - sdk-catalog-scope-warning (test:domain, test:demo-mode, test:onboarding): Live SDK search matches and directory snapshots disclose that returned provider results are not a verified complete catalog; Demo results identify their limited synthetic sample. Evidence: Live/Demo SDK runtime assertions check search and snapshot warning fields; onboarding states the provider results are not a completeness guarantee.
  - live-mcp-catalog-scope-copy (test:mcp-app-ui, test:mcp-live-catalog-warning): All three Live MCP research tools disclose returned-match scope in tool metadata and actual results; the native research view renders the same warning. Evidence: A loopback-only synthetic provider launches the MCP server in Live mode; the test calls discovery, comparison and research, checks English/Chinese structured warnings, and renders the actual research result. The UI harness separately checks the shared native view resource.
  - demo-catalog-scope-warning (test:demo-mode, test:mcp-app-ui): Demo SDK/MCP responses and native research cards label fixtures as a limited synthetic sample, not a complete live catalog. Evidence: Demo integration assertions inspect actual SDK/MCP warning fields and the rendered card, including the limited-sample disclosure.
  - inventory-and-pagination-uncertainty (test:phase26-limitations): The 545 declared versus 488 returned representation observation remains unexplained; pagination and total-count semantics are not claimed as verified. Evidence: The focused regression reconciles the sanitized recorded counts with the documented unresolved cause and explicit no-completeness claim.
  - tab-filter-semantics-uncertainty (test:phase26-limitations): Equal identity sets observed for two sampled tab IDs are reported as an observation and do not establish that provider filtering is ignored. Evidence: The regression checks the sampled identity-set equality and the explicit limitation against inferring filter semantics.
  - directory-fields-and-status-uncertainty (test:phase26-limitations, test:domain): Missing directory timestamps/liquidity and unrecognized market statuses remain unknown rather than receiving invented values. Evidence: The observation regression checks missing-field counts/statuses; domain normalization tests preserve missing values and unknown states.
  - freshness-sla-uncertainty (test:phase26-limitations, test:domain, test:presentation): The sampled quote ages establish neither an acceptable maximum age nor a provider freshness SLA. Evidence: The evidence regression checks the two recorded quote-age observations and unresolved SLA; SDK and bilingual presentation checks explicitly reject a freshness guarantee.
  - missing-data-fidelity (test:asset-intent-query, test:mcp-enrichment, test:presentation, test:demo-mode): Asset identity is preserved, and absent liquidity/timestamps or unknown market status are not converted into positive or zero values. Evidence: Identity/enrichment regressions assert exact requested representations and fail-closed mismatches; presentation and Demo tests verify absent data and unknown states remain explicit.
  - bounded-observation-integrity (test:phase26-limitations, test:core-product-phase-plan): The single approved six-request serial GET sample records its safe query scope and aggregation methods, discloses limits on independent recomputation, and contains no raw provider payloads or credentials. Evidence: Both tests check the six-request/zero-retry observation, query parameters, aggregation definitions, recomputation limitation and absence of provider payloads/credentials.
  - terminal-local-scope (test:core-product-phase-plan, test:onboarding, test:jev-shadow): Phase 26's reviewed deliverable is local SDK/MCP evidence ending at its named terminal state; the Jev review itself does not authorize separate Git sync, publication, deployment, wallet signing or broadcast. Evidence: Phase-plan assertions bind Phase 26 to the local terminal state; onboarding and phase-gate regressions distinguish local validation from separate release authorization and verify failed reviews do not advance.
- Jev confidence by review item: status=0.940, nextAction=0.910, riskLevel=0.980, criterion_sdk-freshness-contract=0.980, criterion_agent-facing-freshness-copy=0.970, criterion_sdk-catalog-scope-warning=0.940, criterion_live-mcp-catalog-scope-copy=0.930, criterion_demo-catalog-scope-warning=0.960, criterion_inventory-and-pagination-uncertainty=0.920, criterion_tab-filter-semantics-uncertainty=0.920, criterion_directory-fields-and-status-uncertainty=0.950, criterion_freshness-sla-uncertainty=0.980, criterion_missing-data-fidelity=0.930, criterion_bounded-observation-integrity=0.970, criterion_terminal-local-scope=0.940
- Jev criterion findings: Criterion sdk-freshness-contract: met (0.980 confidence) — SDK market context distinguishes provider response timestamps from per-asset quote timestamps and states that timestamps do not establish data freshness or a freshness SLA.; Criterion agent-facing-freshness-copy: met (0.970 confidence) — English and Chinese Agent-facing cards, briefs, and the native MCP research view retain freshness caveats together with source and timestamp context.; Criterion sdk-catalog-scope-warning: met (0.940 confidence) — Live SDK search matches and directory snapshots disclose that returned provider results are not a verified complete catalog; Demo results identify their limited synthetic sample.; Criterion live-mcp-catalog-scope-copy: met (0.930 confidence) — All three Live MCP research tools disclose returned-match scope in tool metadata and actual results; the native research view renders the same warning.; Criterion demo-catalog-scope-warning: met (0.960 confidence) — Demo SDK/MCP responses and native research cards label fixtures as a limited synthetic sample, not a complete live catalog.; Criterion inventory-and-pagination-uncertainty: met (0.920 confidence) — The 545 declared versus 488 returned representation observation remains unexplained; pagination and total-count semantics are not claimed as verified.; Criterion tab-filter-semantics-uncertainty: met (0.920 confidence) — Equal identity sets observed for two sampled tab IDs are reported as an observation and do not establish that provider filtering is ignored.; Criterion directory-fields-and-status-uncertainty: met (0.950 confidence) — Missing directory timestamps/liquidity and unrecognized market statuses remain unknown rather than receiving invented values.; Criterion freshness-sla-uncertainty: met (0.980 confidence) — The sampled quote ages establish neither an acceptable maximum age nor a provider freshness SLA.; Criterion missing-data-fidelity: met (0.930 confidence) — Asset identity is preserved, and absent liquidity/timestamps or unknown market status are not converted into positive or zero values.; Criterion bounded-observation-integrity: met (0.970 confidence) — The single approved six-request serial GET sample records its safe query scope and aggregation methods, discloses limits on independent recomputation, and contains no raw provider payloads or credentials.; Criterion terminal-local-scope: met (0.940 confidence) — Phase 26's reviewed deliverable is local SDK/MCP evidence ending at its named terminal state; the Jev review itself does not authorize separate Git sync, publication, deployment, wallet signing or broadcast.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T02:57:07.174Z
- Phase: `official-provider-contract-audit`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.480`
- Agreement: `true`
- Latency: `1009 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion documented-endpoint-contract: insufficient_evidence — Documented list/search/price filters, asset types, status fields, and timestamps are correctly recorded and mapped to source-level Ariadne gaps.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - count-semantics-and-residual-gap (test:phase27-contract, test:phase26-limitations): Official definitions distinguish underlying-asset tickerCount from per-chain token representations and the observed 57-row difference remains honestly unresolved, not blamed on pagination. Evidence: The structured official contract record and regression check the published count definitions, 545/488 subtraction, no completeness claim, and no pagination inference.
  - documented-endpoint-contract (typecheck, test:phase27-contract): Documented list/search/price filters, asset types, status fields, and timestamps are correctly recorded and mapped to source-level Ariadne gaps. Evidence: Contract regression checks the official endpoint field inventory and source model review; TypeScript types compile.
  - bounded-evidence-and-no-reprobe (test:phase27-contract, test:phase26-limitations): Phase27 uses only official documentation and repository source, records schema-download timeout and does not call Binance or expose credentials/raw payloads. Evidence: Machine-readable record asserts official source, no repeated request, docs limits and sanitized scope.
  - approved-sequential-boundary (test:core-product-phase-plan, test:phase27-contract): Phase27–29 objectives, checks, auto progression and external/safety boundaries are explicit and reconciled with the approved roadmap. Evidence: Core phase-plan regression verifies P27–29 definitions, approved continuation, current successor behavior and report links.
- Jev confidence by review item: status=0.750, nextAction=0.900, riskLevel=0.990, criterion_count-semantics-and-residual-gap=0.660, criterion_documented-endpoint-contract=0.520, criterion_bounded-evidence-and-no-reprobe=0.480, criterion_approved-sequential-boundary=0.530
- Jev criterion findings: Criterion count-semantics-and-residual-gap: met (0.660 confidence) — Official definitions distinguish underlying-asset tickerCount from per-chain token representations and the observed 57-row difference remains honestly unresolved, not blamed on pagination.; Criterion documented-endpoint-contract: insufficient_evidence (0.520 confidence) — Documented list/search/price filters, asset types, status fields, and timestamps are correctly recorded and mapped to source-level Ariadne gaps.; Criterion bounded-evidence-and-no-reprobe: insufficient_evidence (0.480 confidence) — Phase27 uses only official documentation and repository source, records schema-download timeout and does not call Binance or expose credentials/raw payloads.; Criterion approved-sequential-boundary: met (0.530 confidence) — Phase27–29 objectives, checks, auto progression and external/safety boundaries are explicit and reconciled with the approved roadmap.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T03:04:42.448Z
- Phase: `official-provider-contract-audit`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.460`
- Agreement: `true`
- Latency: `1353 ms`
- Phase transition: `pause`
- Transition reason: Criterion official-endpoint-fields lacks a sufficiently confident Jev review (0.460); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - count-units-and-57-gap (test:phase27-contract, test:phase26-limitations): Keep the official underlying-asset tickerCount distinct from per-chain tokenCount and leave the measured 545 versus 488 (difference 57) unexplained; do not blame pagination. Evidence: The contract regression computes 545-488=57 from the recorded values and asserts the official definitions plus the explicit text that pagination cannot be asserted as the cause. The Phase 26 regression independently asserts the observation and unresolved pagination semantics.
  - official-endpoint-fields (test:phase27-contract): The rendered official contract record contains the token list chain/platform/tab filters, asset-type values, all six marketStatus values, reason/open/close fields, and the distinct list-envelope versus price-item timestamps. Evidence: test:phase27-contract asserts each recorded optional filter, all six enum strings, all five status detail fields, token-list absence of documented per-item quote timestamp, and the separate price endpoint tokenPriceUpdatedAt semantics.
  - source-to-domain-loss-crosswalk (typecheck, test:phase27-contract): Only identify Ariadne data losses that are directly visible from upstream TypeScript response declarations through mapping/normalization into downstream domain types. Evidence: Regression inspects RwaSearchResponse, RwaTokenResponse, search(), listSnapshot(), normalizeMarketStatus(), normalizeMarketContext(), StockAsset, TokenizedStockListing and MarketContext. It asserts assetType is dropped on both paths and reasonCode/reasonMsg/nextCloseTime are absent; the structured crosswalk names the scoped Phase 28 repair.
  - offline-audit-boundary (test:phase27-contract, test:phase26-limitations, test:core-product-phase-plan): Phase 27 makes zero Binance endpoint requests, reads no credentials or raw provider payloads, performs no external writes, and uses only the declared local checks. Evidence: The phase record lists zero requests/writes and the exact four checks. Regression verifies their npm commands resolve only to tsc or local fs/assert scripts, and those scripts import no network client or invoke fetch/http requests.
  - approved-next-phase-boundary (test:core-product-phase-plan, test:phase27-contract): The approved Phase 27–29 order and automation boundaries remain explicit; Phase 28 repairs only these source-confirmed fields using synthetic fixtures and no provider probe, publication or transaction action. Evidence: Core roadmap regression asserts all three phase IDs, approved sequential continuation, each phase objective and external/safety boundaries, and the terminal local scope.
- Jev confidence by review item: status=0.950, nextAction=0.980, riskLevel=1.000, criterion_count-units-and-57-gap=0.930, criterion_official-endpoint-fields=0.460, criterion_source-to-domain-loss-crosswalk=0.950, criterion_offline-audit-boundary=0.870, criterion_approved-next-phase-boundary=0.780
- Jev criterion findings: Criterion count-units-and-57-gap: met (0.930 confidence) — Keep the official underlying-asset tickerCount distinct from per-chain tokenCount and leave the measured 545 versus 488 (difference 57) unexplained; do not blame pagination.; Criterion official-endpoint-fields: met (0.460 confidence) — The rendered official contract record contains the token list chain/platform/tab filters, asset-type values, all six marketStatus values, reason/open/close fields, and the distinct list-envelope versus price-item timestamps.; Criterion source-to-domain-loss-crosswalk: met (0.950 confidence) — Only identify Ariadne data losses that are directly visible from upstream TypeScript response declarations through mapping/normalization into downstream domain types.; Criterion offline-audit-boundary: met (0.870 confidence) — Phase 27 makes zero Binance endpoint requests, reads no credentials or raw provider payloads, performs no external writes, and uses only the declared local checks.; Criterion approved-next-phase-boundary: met (0.780 confidence) — The approved Phase 27–29 order and automation boundaries remain explicit; Phase 28 repairs only these source-confirmed fields using synthetic fixtures and no provider probe, publication or transaction action.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T03:07:10.887Z
- Phase: `official-provider-contract-audit`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.600`
- Agreement: `true`
- Latency: `1332 ms`
- Phase transition: `pause`
- Transition reason: Criterion source-to-domain-loss-crosswalk lacks a sufficiently confident Jev review (0.840); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - official-platform-count-definitions (test:phase27-contract, test:phase26-limitations): The official platforms response defines tickerCount as underlying assets and chainDistribution.tokenCount as per-chain RWA tokens, counting cross-chain deployments separately. Evidence: Binance RWA Data page section Get RWA Token Issuance Platforms, lines 184-209; the record stores those section lines and exact definitions, and the regression asserts both phrases plus the 545/488/57 arithmetic.
  - official-token-list-contract (test:phase27-contract): The official token-list section records optional binanceChainId/platformId/tabId filters, assetType 1/2/3, all marketStatus enums, reason fields, next-open/close and envelope timestamp. Evidence: Primary source section Get RWA Token List, lines 855-1232; regression asserts the section locator, all three filters, all six statuses, all five status detail fields, all assetType values and the envelope/per-item timestamp distinction.
  - official-search-price-contract (test:phase27-contract): The official search and price sections are kept separate: search documents keyword/platformId and assetType; price documents the per-token timestamp separately from response timestamp. Evidence: Primary source sections Search RWA Token lines 435-632 and Get RWA Token Price lines 259-428; the contract test asserts both exact section locators, search filter wording and price tokenPriceUpdatedAt semantics.
  - source-to-domain-loss-crosswalk (typecheck, test:phase27-contract): Only identify Ariadne data losses that are directly visible from upstream response declarations through mapping/normalization into downstream domain types. Evidence: Regression checks RwaSearchResponse, RwaTokenResponse, search(), listSnapshot(), normalizeMarketStatus(), normalizeMarketContext(), StockAsset, TokenizedStockListing and MarketContext. It asserts assetType loss and missing reasonCode/reasonMsg/nextCloseTime; the structured crosswalk ties each gap to a bounded Phase 28 repair.
  - bounded-offline-review (test:phase27-contract, test:phase26-limitations, test:core-product-phase-plan): Phase 27 performs no provider endpoint request, credential access, raw-payload handling or external write and the gate runs only declared local checks. Evidence: Machine-readable execution record lists 0 provider requests, 0 external writes and the four exact checks. Regression verifies each npm script maps to tsc or local fs/assert code and those local scripts invoke no HTTP/fetch/provider client.
  - approved-sequential-continuation (test:core-product-phase-plan, test:phase27-contract): The user-approved Phase 27 to 28 to 29 sequence is explicit, and phase 28 scope remains limited to these documented source-confirmed fields with synthetic fixtures. Evidence: Core roadmap regression asserts the exact IDs/order, phase objectives, the user authorization, automatic advance only after each gate, and no new provider probe or external transaction/publication authority.
  - phase-boundary-enforcement (test:core-product-phase-plan): A low Jev confidence or unmet criterion keeps Phase 27 active; no approval is claimed and Phase 28 cannot start until every criterion is met at confidence at least 0.85. Evidence: The phase-plan test reads the actual phase ledger and Jev JSONL, verifies currentPhase/nextPhase/lastTransition match the latest decision, and requires confidence >=0.85 plus all-met criterion reviews before marking Phase 27 complete.
- Jev confidence by review item: status=0.840, nextAction=0.830, riskLevel=1.000, criterion_official-platform-count-definitions=0.920, criterion_official-token-list-contract=0.960, criterion_official-search-price-contract=0.910, criterion_source-to-domain-loss-crosswalk=0.840, criterion_bounded-offline-review=0.930, criterion_approved-sequential-continuation=0.600, criterion_phase-boundary-enforcement=0.860
- Jev criterion findings: Criterion official-platform-count-definitions: met (0.920 confidence) — The official platforms response defines tickerCount as underlying assets and chainDistribution.tokenCount as per-chain RWA tokens, counting cross-chain deployments separately.; Criterion official-token-list-contract: met (0.960 confidence) — The official token-list section records optional binanceChainId/platformId/tabId filters, assetType 1/2/3, all marketStatus enums, reason fields, next-open/close and envelope timestamp.; Criterion official-search-price-contract: met (0.910 confidence) — The official search and price sections are kept separate: search documents keyword/platformId and assetType; price documents the per-token timestamp separately from response timestamp.; Criterion source-to-domain-loss-crosswalk: met (0.840 confidence) — Only identify Ariadne data losses that are directly visible from upstream response declarations through mapping/normalization into downstream domain types.; Criterion bounded-offline-review: met (0.930 confidence) — Phase 27 performs no provider endpoint request, credential access, raw-payload handling or external write and the gate runs only declared local checks.; Criterion approved-sequential-continuation: met (0.600 confidence) — The user-approved Phase 27 to 28 to 29 sequence is explicit, and phase 28 scope remains limited to these documented source-confirmed fields with synthetic fixtures.; Criterion phase-boundary-enforcement: met (0.860 confidence) — A low Jev confidence or unmet criterion keeps Phase 27 active; no approval is claimed and Phase 28 cannot start until every criterion is met at confidence at least 0.85.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T03:13:51.982Z
- Phase: `official-provider-contract-audit`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.190`
- Agreement: `true`
- Latency: `1219 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion official-platform-count-definitions: gap — The official platforms response defines tickerCount as underlying assets and chainDistribution.tokenCount as per-chain RWA tokens, counting cross-chain deployments separately; the observed 545 versus 488 difference remains unexplained.. Diagnose or repair this criterion before advancing.
- Acceptance criteria and supplied evidence:
  - official-platform-count-definitions (test:phase27-contract, test:phase26-limitations): The official platforms response defines tickerCount as underlying assets and chainDistribution.tokenCount as per-chain RWA tokens, counting cross-chain deployments separately; the observed 545 versus 488 difference remains unexplained. Evidence: Binance RWA Data section Get RWA Token Issuance Platforms, lines 184-209. The regression asserts source section locator, both definitions and 545-488=57; Phase 26 independently asserts that pagination semantics remain unverified.
  - official-token-list-contract (test:phase27-contract): The official token-list section records optional binanceChainId/platformId/tabId filters, assetType 1/2/3, all six marketStatus values, reason/open/close fields, envelope timestamp, and the exact fields not documented there. Evidence: Primary source section Get RWA Token List, lines 855-1232; regression asserts the locator, filters, all six enum values, reasonCode/reasonMsg/nextOpenTime/nextCloseTime, total-count/pagination omissions and no per-item tokenPriceUpdatedAt/liquidity promise.
  - official-search-price-contract (test:phase27-contract): Official search and price contracts remain distinct: search documents keyword/platformId and assets[].assetType; price documents per-token tokenPriceUpdatedAt separately from response timestamp. Evidence: Primary source sections Search RWA Token lines 435-632 and Get RWA Token Price lines 259-428; regression asserts both line locators, query semantics and per-asset versus envelope timestamp.
  - source-to-domain-loss-crosswalk (typecheck, test:phase27-contract): Ariadne source-confirmed asset-type and detailed status/reason losses are verified from response types through mapping into actual SDK consumer output, not inferred from names alone. Evidence: The in-memory fixture calls actual TokenizedStocksService.search() and listSnapshot() with synthetic assetType=2 and statusInfo reason fields. Assertions prove assetType/reasonCode/reasonMsg/nextCloseTime are absent in output and pause is reduced to closed; static assertions trace RwaSearchResponse, RwaTokenResponse, normalizers and domain types.
  - bounded-offline-review (test:phase27-contract, test:phase26-limitations, test:core-product-phase-plan, test:jev-shadow): Phase 27 performs zero Binance endpoint requests, credential access, raw-provider-payload handling or external writes; all selected checks are local/typecheck only. Evidence: Structured boundary records zero endpoint requests/writes and lists five checks. Regressions inspect the exact npm commands; data-path tests inject an in-memory client, and Jev tests use mocked decisions and temporary local files.
  - enforced-approved-sequential-flow (test:core-product-phase-plan, test:jev-shadow): The approved P27→P28→P29 continuation cannot skip a phase; failed checks, unmet criteria, or confidence below 0.85 pause at the current phase. Evidence: run-jev-gate calls assertApprovedPhaseSuccessor before checks; the guard permits only P27→P28→P29→delivery-complete. test:jev-shadow accepts those edges, rejects P27→P29/P28→terminal/P29→release, and verifies low-confidence gates pause; roadmap test confirms the recorded user-approved order and phase ledger.
- Jev confidence by review item: status=0.470, nextAction=0.380, riskLevel=0.990, criterion_official-platform-count-definitions=0.190, criterion_official-token-list-contract=0.800, criterion_official-search-price-contract=0.870, criterion_source-to-domain-loss-crosswalk=0.990, criterion_bounded-offline-review=0.790, criterion_enforced-approved-sequential-flow=0.990
- Jev criterion findings: Criterion official-platform-count-definitions: gap (0.190 confidence) — The official platforms response defines tickerCount as underlying assets and chainDistribution.tokenCount as per-chain RWA tokens, counting cross-chain deployments separately; the observed 545 versus 488 difference remains unexplained.; Criterion official-token-list-contract: met (0.800 confidence) — The official token-list section records optional binanceChainId/platformId/tabId filters, assetType 1/2/3, all six marketStatus values, reason/open/close fields, envelope timestamp, and the exact fields not documented there.; Criterion official-search-price-contract: met (0.870 confidence) — Official search and price contracts remain distinct: search documents keyword/platformId and assets[].assetType; price documents per-token tokenPriceUpdatedAt separately from response timestamp.; Criterion source-to-domain-loss-crosswalk: met (0.990 confidence) — Ariadne source-confirmed asset-type and detailed status/reason losses are verified from response types through mapping into actual SDK consumer output, not inferred from names alone.; Criterion bounded-offline-review: met (0.790 confidence) — Phase 27 performs zero Binance endpoint requests, credential access, raw-provider-payload handling or external writes; all selected checks are local/typecheck only.; Criterion enforced-approved-sequential-flow: met (0.990 confidence) — The approved P27→P28→P29 continuation cannot skip a phase; failed checks, unmet criteria, or confidence below 0.85 pause at the current phase.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T03:20:50.186Z
- Phase: `official-provider-contract-audit`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.730`
- Agreement: `true`
- Latency: `1133 ms`
- Phase transition: `pause`
- Transition reason: Criterion sequential-gate lacks a sufficiently confident Jev review (0.730); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - official-count-units (test:phase27-contract): The rendered official platforms docs define tickerCount as underlying assets and chainDistribution.tokenCount as per-chain RWA tokens; keep these units distinct and do not treat tickerCount as token rows. Evidence: The audit records Binance documentation lines 184-209; the regression asserts both field definitions and the cross-chain counting note.
  - phase26-observed-counts (test:phase27-contract, test:phase26-limitations): Report 545 as the Phase 26 sum of BSC chainDistribution.tokenCount and 488 as distinct returned chain-plus-contract identities; retain the arithmetic difference of 57 as unexplained, without claiming identical scope or a cause. Evidence: The sanitized Phase 26 record retains both aggregation methods and values; focused regressions assert 545-488=57, no raw rows, and unresolved pagination/completeness.
  - published-token-list-fields (test:phase27-contract): Record the published token-list filters, asset-type and market-status values, reason and open/close fields, and envelope timestamp without claiming runtime behavior beyond the documentation. Evidence: The official contract record locates the rendered token-list section at lines 855-1232; regression assertions check the documented filters, enums, detailed status fields, and timestamp.
  - rendered-documentation-limits (test:phase27-contract, test:phase26-limitations): Bound omissions to the rendered token-list documentation: it does not list pagination or total-count fields, and this must not be stated as proof that runtime pagination does not exist. Evidence: The audit states the rendered-page boundary and OpenAPI download timeout; tests assert no runtime/pagination completeness claim and preserve the unresolved observation.
  - search-price-contract (test:phase27-contract): Keep documented search fields and per-token price timestamp distinct from response-envelope timestamps and from token-list fields. Evidence: The source crosswalk records separate search, price and list sections; tests assert tokenPriceUpdatedAt semantics and distinguish it from envelope timestamp.
  - source-to-domain-fidelity-gap (test:phase27-contract): Identify only source-confirmed fields lost in Ariadne's response-to-domain/consumer path, backed by an in-memory fixture of the actual service; do not infer provider runtime behavior. Evidence: A synthetic BinanceWeb3Client fixture exercises actual search() and listSnapshot() and asserts assetType and detailed status/reason fields are lost in current consumer output.
  - offline-evidence-boundary (test:phase27-contract): Use only local checks and synthetic fixtures in Phase 27; make no Binance endpoint request, use no Binance provider credential, retain no raw payload, perform no external write, and disclose no Jev reviewer authentication value. Evidence: The execution record states zero provider requests, zero provider-credential use, no raw payload or external write, and separately records configured Jev review authentication with no value in evidence.
  - sequential-gate (test:core-product-phase-plan, test:jev-shadow): Enforce the approved Phase 27 to 28 to 29 order; a low-confidence or unmet gate must remain in the current phase, and Phase 28 scope stays limited to source-confirmed fidelity repairs. Evidence: The plan tests the scoped Phase 28 objective; Jev shadow tests permit only named successors and reject skips, terminal escape, and failed-review advancement.
- Jev confidence by review item: status=0.860, nextAction=0.740, riskLevel=0.990, criterion_official-count-units=0.960, criterion_phase26-observed-counts=0.980, criterion_published-token-list-fields=0.930, criterion_rendered-documentation-limits=0.850, criterion_search-price-contract=0.930, criterion_source-to-domain-fidelity-gap=0.950, criterion_offline-evidence-boundary=0.960, criterion_sequential-gate=0.730
- Jev criterion findings: Criterion official-count-units: met (0.960 confidence) — The rendered official platforms docs define tickerCount as underlying assets and chainDistribution.tokenCount as per-chain RWA tokens; keep these units distinct and do not treat tickerCount as token rows.; Criterion phase26-observed-counts: met (0.980 confidence) — Report 545 as the Phase 26 sum of BSC chainDistribution.tokenCount and 488 as distinct returned chain-plus-contract identities; retain the arithmetic difference of 57 as unexplained, without claiming identical scope or a cause.; Criterion published-token-list-fields: met (0.930 confidence) — Record the published token-list filters, asset-type and market-status values, reason and open/close fields, and envelope timestamp without claiming runtime behavior beyond the documentation.; Criterion rendered-documentation-limits: met (0.850 confidence) — Bound omissions to the rendered token-list documentation: it does not list pagination or total-count fields, and this must not be stated as proof that runtime pagination does not exist.; Criterion search-price-contract: met (0.930 confidence) — Keep documented search fields and per-token price timestamp distinct from response-envelope timestamps and from token-list fields.; Criterion source-to-domain-fidelity-gap: met (0.950 confidence) — Identify only source-confirmed fields lost in Ariadne's response-to-domain/consumer path, backed by an in-memory fixture of the actual service; do not infer provider runtime behavior.; Criterion offline-evidence-boundary: met (0.960 confidence) — Use only local checks and synthetic fixtures in Phase 27; make no Binance endpoint request, use no Binance provider credential, retain no raw payload, perform no external write, and disclose no Jev reviewer authentication value.; Criterion sequential-gate: met (0.730 confidence) — Enforce the approved Phase 27 to 28 to 29 order; a low-confidence or unmet gate must remain in the current phase, and Phase 28 scope stays limited to source-confirmed fidelity repairs.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T03:22:40.840Z
- Phase: `official-provider-contract-audit`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.850`
- Agreement: `true`
- Latency: `1133 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - official-count-units (test:phase27-contract): The rendered official platforms docs define tickerCount as underlying assets and chainDistribution.tokenCount as per-chain RWA tokens; keep these units distinct and do not treat tickerCount as token rows. Evidence: The audit records Binance documentation lines 184-209; the regression asserts both field definitions and the cross-chain counting note.
  - phase26-observed-counts (test:phase27-contract, test:phase26-limitations): Report 545 as the Phase 26 sum of BSC chainDistribution.tokenCount and 488 as distinct returned chain-plus-contract identities; retain the arithmetic difference of 57 as unexplained, without claiming identical scope or a cause. Evidence: The sanitized Phase 26 record retains both aggregation methods and values; focused regressions assert 545-488=57, no raw rows, and unresolved pagination/completeness.
  - published-token-list-fields (test:phase27-contract): Record the published token-list filters, asset-type and market-status values, reason and open/close fields, and envelope timestamp without claiming runtime behavior beyond the documentation. Evidence: The official contract record locates the rendered token-list section at lines 855-1232; regression assertions check the documented filters, enums, detailed status fields, and timestamp.
  - rendered-documentation-limits (test:phase27-contract, test:phase26-limitations): Bound omissions to the rendered token-list documentation: it does not list pagination or total-count fields, and this must not be stated as proof that runtime pagination does not exist. Evidence: The audit states the rendered-page boundary and OpenAPI download timeout; tests assert no runtime/pagination completeness claim and preserve the unresolved observation.
  - search-price-contract (test:phase27-contract): Keep documented search fields and per-token price timestamp distinct from response-envelope timestamps and from token-list fields. Evidence: The source crosswalk records separate search, price and list sections; tests assert tokenPriceUpdatedAt semantics and distinguish it from envelope timestamp.
  - source-to-domain-fidelity-gap (test:phase27-contract): Identify only source-confirmed fields lost in Ariadne's response-to-domain/consumer path, backed by an in-memory fixture of the actual service; do not infer provider runtime behavior. Evidence: A synthetic BinanceWeb3Client fixture exercises actual search() and listSnapshot() and asserts assetType and detailed status/reason fields are lost in current consumer output.
  - offline-evidence-boundary (test:phase27-contract): Use only local checks and synthetic fixtures in Phase 27; make no Binance endpoint request, use no Binance provider credential, retain no raw payload, perform no external write, and disclose no Jev reviewer authentication value. Evidence: The execution record states zero provider requests, zero provider-credential use, no raw payload or external write, and separately records configured Jev review authentication with no value in evidence.
  - phase27-low-score-hold (test:jev-shadow): A Phase 27 Jev result below 0.85 must pause even when every criterion is met, and the phase-state ledger must keep Phase 27 current rather than entering Phase 28. Evidence: A new deterministic regression injects a .84 Jev result with a met criterion, asserts pause and the threshold reason, then checks currentPhase remains official-provider-contract-audit.
  - phase27-successor-only (test:jev-shadow): The gate permits the approved Phase 27 to Phase 28 successor and rejects Phase 27 to Phase 29, preserving strict sequence. Evidence: The state-machine regression asserts the named Phase 27 successor and rejects the direct Phase 27 to Phase 29 skip before phase-state advancement.
  - approved-phase28-scope (test:core-product-phase-plan, test:jev-shadow): Continue automatically to Phase 28 only after Phase 27 passes its selected checks and Jev threshold; Phase 28 remains limited to the user-approved source-confirmed data-fidelity work and the listed authorization boundaries. Evidence: The phase plan and regression confirm user-approved 27-29 automatic progression, scoped Phase 28 acceptance, and no transition on low-confidence review; separate public/wallet/external-write boundaries remain excluded.
- Jev confidence by review item: status=0.900, nextAction=0.850, riskLevel=1.000, criterion_official-count-units=0.960, criterion_phase26-observed-counts=0.980, criterion_published-token-list-fields=0.940, criterion_rendered-documentation-limits=0.880, criterion_search-price-contract=0.930, criterion_source-to-domain-fidelity-gap=0.970, criterion_offline-evidence-boundary=0.920, criterion_phase27-low-score-hold=0.990, criterion_phase27-successor-only=0.990, criterion_approved-phase28-scope=0.940
- Jev criterion findings: Criterion official-count-units: met (0.960 confidence) — The rendered official platforms docs define tickerCount as underlying assets and chainDistribution.tokenCount as per-chain RWA tokens; keep these units distinct and do not treat tickerCount as token rows.; Criterion phase26-observed-counts: met (0.980 confidence) — Report 545 as the Phase 26 sum of BSC chainDistribution.tokenCount and 488 as distinct returned chain-plus-contract identities; retain the arithmetic difference of 57 as unexplained, without claiming identical scope or a cause.; Criterion published-token-list-fields: met (0.940 confidence) — Record the published token-list filters, asset-type and market-status values, reason and open/close fields, and envelope timestamp without claiming runtime behavior beyond the documentation.; Criterion rendered-documentation-limits: met (0.880 confidence) — Bound omissions to the rendered token-list documentation: it does not list pagination or total-count fields, and this must not be stated as proof that runtime pagination does not exist.; Criterion search-price-contract: met (0.930 confidence) — Keep documented search fields and per-token price timestamp distinct from response-envelope timestamps and from token-list fields.; Criterion source-to-domain-fidelity-gap: met (0.970 confidence) — Identify only source-confirmed fields lost in Ariadne's response-to-domain/consumer path, backed by an in-memory fixture of the actual service; do not infer provider runtime behavior.; Criterion offline-evidence-boundary: met (0.920 confidence) — Use only local checks and synthetic fixtures in Phase 27; make no Binance endpoint request, use no Binance provider credential, retain no raw payload, perform no external write, and disclose no Jev reviewer authentication value.; Criterion phase27-low-score-hold: met (0.990 confidence) — A Phase 27 Jev result below 0.85 must pause even when every criterion is met, and the phase-state ledger must keep Phase 27 current rather than entering Phase 28.; Criterion phase27-successor-only: met (0.990 confidence) — The gate permits the approved Phase 27 to Phase 28 successor and rejects Phase 27 to Phase 29, preserving strict sequence.; Criterion approved-phase28-scope: met (0.940 confidence) — Continue automatically to Phase 28 only after Phase 27 passes its selected checks and Jev threshold; Phase 28 remains limited to the user-approved source-confirmed data-fidelity work and the listed authorization boundaries.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T03:55:02.127Z
- Phase: `source-confirmed-data-fidelity`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.350`
- Agreement: `true`
- Latency: `1276 ms`
- Phase transition: `pause`
- Transition reason: Criterion market-context-fidelity lacks a sufficiently confident Jev review (0.780); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - asset-type-fidelity (test:phase28-fidelity, test:domain, test:presentation): Preserve provider assetType through search and token-list mapping, domain models, bilingual Agent research/comparison, MCP structured results, and native research UI; preserve unknown numeric values without relabeling. Evidence: Synthetic response fixtures exercise actual service mapping for search and token list and assert documented Stock/Pre-IPO/ETF plus unknown type behavior across Agent and UI surfaces.
  - market-context-fidelity (test:phase28-fidelity, test:domain, test:presentation, test:mcp-enrichment): Carry exact provider market status, normalized status, open state, reason code/message, next-open/next-close and provenance where present through SDK/domain and bilingual MCP surfaces. Evidence: Focused synthetic assertions verify domain mapping, provenance, Agent text, structured data and comparison context without claiming live-provider freshness.
  - actual-mcp-native-ui-parity (test:mcp-live-catalog-warning, test:mcp-app-ui, test:presentation): Verify Phase 28 fields through actual MCP tool invocations, text and structured output, and native research rendering in English and Chinese using only a loopback synthetic provider. Evidence: A stdio MCP subprocess calls all three research tools against a local HTTP fixture, checks localized output and structured fields, then renders the actual result through the native view.
  - fail-closed-market-safety (test:phase28-fidelity, test:plan-registry, test:execution-dry-run, test:guarded-sdk-executor): Provider pause remains non-tradable; unknown market status remains unknown and blocks execution, and market status is required in SDK/MCP registered action-plan preflight. Evidence: Safety tests assert pause and unknown status are blocked; registry tests reject absent status checks; execution rehearsal and guarded executor preserve existing pre-broadcast controls.
  - untrusted-text-and-time-validation (test:phase28-fidelity, test:mcp-live-catalog-warning, test:mcp-app-ui): Provider reason text cannot inject Markdown or native-UI markup, and next-open/next-close timestamps outside the safe supported millisecond range are withheld. Evidence: Adversarial synthetic text is checked in Agent Markdown and HTML rendering; malformed or out-of-range timestamps are asserted absent, including on MCP result rendering.
  - bounded-local-evidence-and-known-limits (test:mcp-live-catalog-warning, test:phase27-contract, test:phase26-limitations, test:core-product-phase-plan): Phase 28 uses synthetic/local evidence only, makes no provider re-probe or external write, and retains the unexplained 545-versus-488 observation and catalog/freshness uncertainty. Evidence: The integration fixture asserts loopback-only GETs; phase records and regressions preserve zero provider requests/writes and keep Phase 26 count, completeness and freshness observations unresolved.
  - approved-phase-sequence (test:core-product-phase-plan, test:jev-shadow): Advance only from Phase 28 to the pre-authorized Phase 29 after all selected deterministic checks and every Jev criterion pass at confidence of at least 0.85; retain all external-write and high-risk boundaries. Evidence: Roadmap and Jev state-machine regressions verify the exact Phase 27→28→29 chain, reject skips, hold low-confidence phases, and preserve the user's continuation boundaries.
- Jev confidence by review item: status=0.980, nextAction=0.860, riskLevel=0.990, criterion_asset-type-fidelity=0.870, criterion_market-context-fidelity=0.780, criterion_actual-mcp-native-ui-parity=0.950, criterion_fail-closed-market-safety=0.920, criterion_untrusted-text-and-time-validation=0.950, criterion_bounded-local-evidence-and-known-limits=0.930, criterion_approved-phase-sequence=0.350, deferredScope=1.000
- Jev criterion findings: Criterion asset-type-fidelity: met (0.870 confidence) — Preserve provider assetType through search and token-list mapping, domain models, bilingual Agent research/comparison, MCP structured results, and native research UI; preserve unknown numeric values without relabeling.; Criterion market-context-fidelity: met (0.780 confidence) — Carry exact provider market status, normalized status, open state, reason code/message, next-open/next-close and provenance where present through SDK/domain and bilingual MCP surfaces.; Criterion actual-mcp-native-ui-parity: met (0.950 confidence) — Verify Phase 28 fields through actual MCP tool invocations, text and structured output, and native research rendering in English and Chinese using only a loopback synthetic provider.; Criterion fail-closed-market-safety: met (0.920 confidence) — Provider pause remains non-tradable; unknown market status remains unknown and blocks execution, and market status is required in SDK/MCP registered action-plan preflight.; Criterion untrusted-text-and-time-validation: met (0.950 confidence) — Provider reason text cannot inject Markdown or native-UI markup, and next-open/next-close timestamps outside the safe supported millisecond range are withheld.; Criterion bounded-local-evidence-and-known-limits: met (0.930 confidence) — Phase 28 uses synthetic/local evidence only, makes no provider re-probe or external write, and retains the unexplained 545-versus-488 observation and catalog/freshness uncertainty.; Criterion approved-phase-sequence: met (0.350 confidence) — Advance only from Phase 28 to the pre-authorized Phase 29 after all selected deterministic checks and every Jev criterion pass at confidence of at least 0.85; retain all external-write and high-risk boundaries.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T04:18:52.528Z
- Phase: `source-confirmed-data-fidelity`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.690`
- Agreement: `true`
- Latency: `1236 ms`
- Phase transition: `pause`
- Transition reason: Criterion approved-phase-sequence lacks a sufficiently confident Jev review (0.730); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - asset-type-preservation (test:phase28-fidelity, test:phase27-contract): Documented Stock, Pre-IPO, ETF, and unknown asset types remain distinguishable across SDK search/list and Agent-facing presentation; unknown values are not relabeled as Stock. Evidence: Synthetic contract regression checks the four documented/unknown type paths in SDK and presentation surfaces, including unknown-type preservation.
  - market-context-field-fidelity (test:phase28-fidelity, test:domain, test:mcp-live-catalog-warning, test:mcp-app-ui): Documented market status, open state, reason code/message, next-open/next-close, quote data and provenance remain available through the SDK market-context result, Agent output, MCP structured result and native research UI. Evidence: Tests compare the actual service market-context fields with Agent text, structured content and native view; loopback MCP invokes all three tools and renders the returned research result.
  - timestamp-validation-and-provenance (test:phase28-fidelity, test:domain, test:phase27-contract, test:mcp-live-catalog-warning): Provider quote-update and response timestamps stay distinct. Only positive safe-integer millisecond values within the supported date range count as valid; malformed times are withheld and are not presented as fresh. Evidence: Boundary fixtures cover zero, negative, fractional, non-finite and out-of-range values across market context, catalog/price snapshots, provenance, freshness and native rendering; the response-vs-quote distinction has a dedicated regression.
  - unknown-status-fails-closed (test:phase28-fidelity, test:domain, test:plan-registry, test:execution-dry-run, test:guarded-sdk-executor): Unknown or non-tradable market status cannot produce an executable plan; market-status preflight is mandatory and a failed check blocks registration and later execution transitions. Evidence: Domain and SDK fixtures assert no action for unknown status; registry tests reject absent/failed market-status checks at registration, simulation and confirmation; offline execution checks report no real wallet or network broadcast.
  - provider-text-safe-rendering (test:phase28-fidelity, test:mcp-app-ui): Untrusted provider reason text is isolated from Agent Markdown and escaped in the native UI without changing the displayed evidence. Evidence: Synthetic hostile Markdown/HTML inputs are exercised through Agent text and the bundled MCP App rendering harness.
  - bilingual-mcp-surface-parity (test:phase28-fidelity, test:presentation, test:mcp-enrichment, test:mcp-app-ui, test:mcp-live-catalog-warning, test:demo-mode): Chinese and English MCP text, structured content and native research UI preserve the same identity and market evidence while retaining research-only boundaries. Evidence: Selected regressions cover bilingual exact-evidence parity, actual loopback Live-mode tool results and native rendering, Demo labeling, and the no-trade boundary.
  - approved-phase-sequence (test:core-product-phase-plan, test:jev-shadow): Phase 28 advances only to the explicitly approved Phase 29 successor after all criteria pass; a low-confidence Phase 28 criterion or skipped successor keeps the phase held. Evidence: Named regressions assert exact Phase 28→29 transition, below-threshold hold, and rejection of phase skips; this criterion supplements but does not replace this live Jev review.
  - local-scope-and-unresolved-provider-limits (test:phase27-contract, test:phase26-limitations, test:mcp-live-catalog-warning, test:core-product-phase-plan): Phase 28 remains local and synthetic: no provider re-probe or external write; unresolved provider coverage and freshness claims remain explicitly unverified. Evidence: The contract audit regression asserts no provider request, the actual Live MCP integration uses only a loopback synthetic provider, and the limitations test preserves unresolved inventory, pagination, fields and freshness-SLA facts.
- Jev confidence by review item: status=0.970, nextAction=0.690, riskLevel=0.960, criterion_asset-type-preservation=0.960, criterion_market-context-field-fidelity=0.890, criterion_timestamp-validation-and-provenance=0.950, criterion_unknown-status-fails-closed=0.990, criterion_provider-text-safe-rendering=0.930, criterion_bilingual-mcp-surface-parity=0.900, criterion_approved-phase-sequence=0.730, criterion_local-scope-and-unresolved-provider-limits=0.890, deferredScope=1.000
- Jev criterion findings: Criterion asset-type-preservation: met (0.960 confidence) — Documented Stock, Pre-IPO, ETF, and unknown asset types remain distinguishable across SDK search/list and Agent-facing presentation; unknown values are not relabeled as Stock.; Criterion market-context-field-fidelity: met (0.890 confidence) — Documented market status, open state, reason code/message, next-open/next-close, quote data and provenance remain available through the SDK market-context result, Agent output, MCP structured result and native research UI.; Criterion timestamp-validation-and-provenance: met (0.950 confidence) — Provider quote-update and response timestamps stay distinct. Only positive safe-integer millisecond values within the supported date range count as valid; malformed times are withheld and are not presented as fresh.; Criterion unknown-status-fails-closed: met (0.990 confidence) — Unknown or non-tradable market status cannot produce an executable plan; market-status preflight is mandatory and a failed check blocks registration and later execution transitions.; Criterion provider-text-safe-rendering: met (0.930 confidence) — Untrusted provider reason text is isolated from Agent Markdown and escaped in the native UI without changing the displayed evidence.; Criterion bilingual-mcp-surface-parity: met (0.900 confidence) — Chinese and English MCP text, structured content and native research UI preserve the same identity and market evidence while retaining research-only boundaries.; Criterion approved-phase-sequence: met (0.730 confidence) — Phase 28 advances only to the explicitly approved Phase 29 successor after all criteria pass; a low-confidence Phase 28 criterion or skipped successor keeps the phase held.; Criterion local-scope-and-unresolved-provider-limits: met (0.890 confidence) — Phase 28 remains local and synthetic: no provider re-probe or external write; unresolved provider coverage and freshness claims remain explicitly unverified.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T04:33:30.504Z
- Phase: `source-confirmed-data-fidelity`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.890`
- Agreement: `true`
- Latency: `1414 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Acceptance criteria and supplied evidence:
  - asset-type-preservation (test:phase28-fidelity, test:phase27-contract): Documented Stock, Pre-IPO, ETF, and unknown asset types remain distinguishable across SDK search/list and Agent-facing presentation; unknown values are not relabeled as Stock. Evidence: Synthetic API/domain regression covers search and directory mappings, all three documented codes, and an unrecognized numeric code through Agent and native labels.
  - market-context-field-fidelity (test:phase28-fidelity, test:domain, test:mcp-live-catalog-warning, test:mcp-app-ui): Every supported market-context value supplied by the service, including token/reference prices, derived gap, status, open flag, reason, times, reported volume/liquidity/holder values and provenance, remains exact through Agent text, MCP structured output and native UI. Evidence: The service test enumerates each returned value; the real stdio MCP subprocess uses a loopback fixture and asserts those exact structured fields, localized text and rendered native card.
  - market-state-conflict-safety (test:phase28-fidelity, test:mcp-live-catalog-warning, test:domain): Contradictory marketStatus/openState fields are never presented as an open market when safety rejects execution; the known contradiction is explicitly warned and blocked. Evidence: A marketStatus=open/openState=false fixture is asserted in SDK safety, English and Chinese Agent cards, and actual MCP native UI; consistent closed/pause behavior remains blocked.
  - timestamp-validation-and-provenance (test:phase28-fidelity, test:domain, test:phase27-contract, test:mcp-live-catalog-warning): Quote-update and endpoint-response times remain distinct, and only positive safe-integer millisecond timestamps within the supported date range are accepted or rendered. Evidence: Fixtures assert response time differs from the per-asset quote time end to end; zero, negative, fractional, non-finite and out-of-range times are withheld across service, freshness, provenance and UI.
  - unknown-status-fails-closed (test:phase28-fidelity, test:domain, test:plan-registry, test:execution-dry-run, test:guarded-sdk-executor): Unknown or provider non-tradable market states cannot create executable actions; mandatory status preflight failures block SDK and MCP plan registration and later transitions. Evidence: SDK assertions verify no action is built for unknown status; registry rejects missing/failed market-status checks at registration, simulation and confirmation; offline rehearsal records no real wallet or network broadcast.
  - provider-text-safe-rendering (test:phase28-fidelity, test:mcp-app-ui): Untrusted provider reason text cannot inject Agent Markdown structure or native UI HTML. Evidence: Hostile synthetic text is checked in Agent markdown and bundled MCP App HTML; the exact structured value remains available while UI markup is escaped.
  - bilingual-mcp-surface-parity (test:phase28-fidelity, test:presentation, test:mcp-enrichment, test:mcp-app-ui, test:mcp-live-catalog-warning, test:demo-mode): Chinese and English MCP text, structured content and native research UI retain matching identity/market evidence and the research-only boundary. Evidence: Deterministic presentation tests and actual loopback Live-mode discovery/comparison/research calls assert bilingual text/structured parity, exact market fields, native rendering, Demo disclosure and no-trade behavior.
  - phase28-ledger-hold-and-exact-successor (test:core-product-phase-plan, test:jev-shadow): Any failed selected check or review criterion below 0.85 keeps Phase 28 active; only complete passing review advances the ledger to the exact user-approved Phase 29 successor. Evidence: The core-plan test reconciles the previous real Jev pause (0.690 overall; 0.730 sequence) with the current Phase 28 ledger hold. Named shadow cases cover failed-check hold, sub-threshold hold, exact Phase 28→29 pass and rejected skip.
  - local-scope-and-provider-limitations (test:phase27-contract, test:phase26-limitations, test:mcp-live-catalog-warning, test:core-product-phase-plan): Phase 28 uses only local synthetic fixtures and performs no provider re-probe or external write; known provider coverage/freshness limits remain unresolved rather than overclaimed. Evidence: The actual MCP fixture binds to loopback and asserts GET-only requests; the source-audit regression asserts no provider request, and the Phase 26 test preserves count, pagination, field and freshness-SLA uncertainties.
- Jev confidence by review item: status=0.980, nextAction=0.890, riskLevel=0.980, criterion_asset-type-preservation=0.890, criterion_market-context-field-fidelity=0.930, criterion_market-state-conflict-safety=0.970, criterion_timestamp-validation-and-provenance=0.980, criterion_unknown-status-fails-closed=0.980, criterion_provider-text-safe-rendering=0.990, criterion_bilingual-mcp-surface-parity=0.970, criterion_phase28-ledger-hold-and-exact-successor=0.910, criterion_local-scope-and-provider-limitations=0.970, deferredScope=1.000
- Jev criterion findings: Criterion asset-type-preservation: met (0.890 confidence) — Documented Stock, Pre-IPO, ETF, and unknown asset types remain distinguishable across SDK search/list and Agent-facing presentation; unknown values are not relabeled as Stock.; Criterion market-context-field-fidelity: met (0.930 confidence) — Every supported market-context value supplied by the service, including token/reference prices, derived gap, status, open flag, reason, times, reported volume/liquidity/holder values and provenance, remains exact through Agent text, MCP structured output and native UI.; Criterion market-state-conflict-safety: met (0.970 confidence) — Contradictory marketStatus/openState fields are never presented as an open market when safety rejects execution; the known contradiction is explicitly warned and blocked.; Criterion timestamp-validation-and-provenance: met (0.980 confidence) — Quote-update and endpoint-response times remain distinct, and only positive safe-integer millisecond timestamps within the supported date range are accepted or rendered.; Criterion unknown-status-fails-closed: met (0.980 confidence) — Unknown or provider non-tradable market states cannot create executable actions; mandatory status preflight failures block SDK and MCP plan registration and later transitions.; Criterion provider-text-safe-rendering: met (0.990 confidence) — Untrusted provider reason text cannot inject Agent Markdown structure or native UI HTML.; Criterion bilingual-mcp-surface-parity: met (0.970 confidence) — Chinese and English MCP text, structured content and native research UI retain matching identity/market evidence and the research-only boundary.; Criterion phase28-ledger-hold-and-exact-successor: met (0.910 confidence) — Any failed selected check or review criterion below 0.85 keeps Phase 28 active; only complete passing review advances the ledger to the exact user-approved Phase 29 successor.; Criterion local-scope-and-provider-limitations: met (0.970 confidence) — Phase 28 uses only local synthetic fixtures and performs no provider re-probe or external write; known provider coverage/freshness limits remain unresolved rather than overclaimed.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T04:42:50.649Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.610`
- Agreement: `true`
- Latency: `1317 ms`
- Phase transition: `pause`
- Transition reason: Criterion natural-language-query-handling lacks a sufficiently confident Jev review (0.800); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-package-consumer (typecheck, build, test:distribution, pack:check, test:cleanroom): The published-package shape is locally consumable: source typechecks/builds, expected exports and declarations are present, dry-run packing succeeds, and a clean-room consumer can install/import/use the package. Evidence: Build, manifest/export checks, npm pack dry-run, and isolated install/import/type declaration plus loopback SDK use all pass; no publication occurs.
  - provider-data-fidelity (test:agent-model, test:domain, test:phase27-contract, test:phase28-fidelity): Documented asset type, market status/reason, timestamps, provenance and optional reported metrics remain source-faithful across SDK/domain normalization, including unknown values and contradictory flags. Evidence: Field-by-field synthetic fixtures cover preserved values, safe timestamps, unknown statuses/types, contradictory market flags and source-time distinctions.
  - mcp-research-and-native-view (test:presentation, test:mcp-enrichment, test:mcp-app-ui, test:mcp-live-catalog-warning): Actual MCP discovery, comparison and research preserve exact asset identity, localized text and structured output, source caveats and the same research content in the native view. Evidence: The real stdio MCP server is called against a loopback-only provider; all three tools, text/structured parity, exact supported fields and rendered native view are asserted.
  - natural-language-query-handling (test:mcp-live-catalog-warning, test:demo-mode, test:onboarding): Chinese and English natural-language research queries are handled by the MCP workflow against deterministic local fixtures, without claiming universal third-party Agent tool selection or making real provider requests. Evidence: The loopback MCP test submits Chinese and English research queries to the production tools; Demo mode resolves natural language and blocks ambiguity; docs bound host auto-selection claims.
  - execution-safety-boundary (test:domain, test:plan-registry, test:execution-dry-run, test:guarded-sdk-executor): Unknown or failed market checks, altered/expired plans, insufficient balances, bad signatures/gas and replay are rejected; the local rehearsal performs no real-wallet use or network broadcast. Evidence: Synthetic executor and registry cases assert fail-closed state transitions, no wallet use, zero network broadcasts, and guarded signature/balance/allowance/replay checks.
  - developer-entry-paths (test:onboarding, test:mcp-config, test:sdk-example, test:distribution, test:cleanroom): Both standalone SDK and MCP-in-an-existing-Agent entry paths have usable, consistent onboarding, example and configuration checks, with secrets kept local and public distribution not overstated. Evidence: Automated docs/config/example/manifest checks and isolated package-consumer install validate the two local developer paths and their stated limits.
  - upstream-uncertainties-and-scope (test:phase26-limitations, test:phase27-contract, test:phase28-fidelity, test:core-product-phase-plan): The 545-versus-488 observation, pagination/filter semantics, omitted directory fields and freshness SLA remain explicitly unresolved; no unsupported completeness or freshness guarantee is introduced. Evidence: Sanitized evidence and contract regressions reconcile observed counts and missing data while preserving unknown meanings and the no-provider-reprobe boundary.
  - sequential-phase-ledger (test:core-product-phase-plan, test:jev-shadow, test:phase27-contract, test:phase28-fidelity): The phase ledger preserves all earlier pause history, records Phase 28 approval, and advances Phase 29 only to its named terminal local state after every selected check and linked criterion pass. Evidence: State-machine regressions prove named successors, reject skipped phases, hold on failures/low scores, and restrict Phase 29 to delivery-complete.
  - terminal-local-scope-and-reports (test:core-product-phase-plan, test:onboarding, test:distribution, test:jev-shadow): The technical/product reports, phase plan, developer log and consumer docs distinguish tested, observed, user-reported and deferred claims; Phase 29 grants no push, publication, deployment, website, wallet or settlement authority. Evidence: Plan/report reconciliation and onboarding/distribution assertions bound local completion; the phase state machine has no successor beyond delivery-complete.
- Jev confidence by review item: status=0.990, nextAction=0.990, riskLevel=1.000, criterion_sdk-package-consumer=0.990, criterion_provider-data-fidelity=0.960, criterion_mcp-research-and-native-view=0.930, criterion_natural-language-query-handling=0.800, criterion_execution-safety-boundary=0.970, criterion_developer-entry-paths=0.800, criterion_upstream-uncertainties-and-scope=0.820, criterion_sequential-phase-ledger=0.950, criterion_terminal-local-scope-and-reports=0.610, deferredScope=0.990
- Jev criterion findings: Criterion sdk-package-consumer: met (0.990 confidence) — The published-package shape is locally consumable: source typechecks/builds, expected exports and declarations are present, dry-run packing succeeds, and a clean-room consumer can install/import/use the package.; Criterion provider-data-fidelity: met (0.960 confidence) — Documented asset type, market status/reason, timestamps, provenance and optional reported metrics remain source-faithful across SDK/domain normalization, including unknown values and contradictory flags.; Criterion mcp-research-and-native-view: met (0.930 confidence) — Actual MCP discovery, comparison and research preserve exact asset identity, localized text and structured output, source caveats and the same research content in the native view.; Criterion natural-language-query-handling: met (0.800 confidence) — Chinese and English natural-language research queries are handled by the MCP workflow against deterministic local fixtures, without claiming universal third-party Agent tool selection or making real provider requests.; Criterion execution-safety-boundary: met (0.970 confidence) — Unknown or failed market checks, altered/expired plans, insufficient balances, bad signatures/gas and replay are rejected; the local rehearsal performs no real-wallet use or network broadcast.; Criterion developer-entry-paths: met (0.800 confidence) — Both standalone SDK and MCP-in-an-existing-Agent entry paths have usable, consistent onboarding, example and configuration checks, with secrets kept local and public distribution not overstated.; Criterion upstream-uncertainties-and-scope: met (0.820 confidence) — The 545-versus-488 observation, pagination/filter semantics, omitted directory fields and freshness SLA remain explicitly unresolved; no unsupported completeness or freshness guarantee is introduced.; Criterion sequential-phase-ledger: met (0.950 confidence) — The phase ledger preserves all earlier pause history, records Phase 28 approval, and advances Phase 29 only to its named terminal local state after every selected check and linked criterion pass.; Criterion terminal-local-scope-and-reports: met (0.610 confidence) — The technical/product reports, phase plan, developer log and consumer docs distinguish tested, observed, user-reported and deferred claims; Phase 29 grants no push, publication, deployment, website, wallet or settlement authority.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T04:55:47.763Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.630`
- Agreement: `true`
- Latency: `1912 ms`
- Phase transition: `pause`
- Transition reason: Criterion standalone-sdk-onboarding lacks a sufficiently confident Jev review (0.830); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (typecheck, build, test:distribution, pack:check, test:cleanroom): A standalone developer can consume the packed SDK: package-root import, type declarations, build, distribution manifest and a search→marketContext request against a local fixture all work. Evidence: The isolated clean-room consumer installs the exact packed tarball, imports package exports/types, performs SDK search and marketContext against loopback, and asserts request-signing headers and provenance.
  - provider-field-fidelity (test:agent-model, test:domain, test:phase27-contract, test:phase28-fidelity): Documented asset types, market status/reason, safe timestamps, provenance and reported market fields remain exact across SDK/domain and presentation; unknown or contradictory values remain explicit and fail closed. Evidence: Source-contract, domain and end-to-end synthetic assertions cover exact values, identity, malformed times, unknown enums, contradictory market flags and safety behavior.
  - mcp-output-native-ui-parity (test:presentation, test:mcp-enrichment, test:mcp-app-ui, test:mcp-live-catalog-warning): The production MCP discovery/comparison/research outputs preserve representation identity, bilingual content, structured/text parity, catalog caveats and supported market data in the same native research view. Evidence: The actual stdio MCP server is invoked on a loopback-only synthetic provider; tool results, structured payload, localized text, native app resource/rendering and exact market evidence are asserted.
  - natural-language-catalog-resolution (test:asset-intent-query, test:mcp-live-catalog-warning, test:demo-mode): When the host invokes the production MCP tools with full Chinese or English research questions, the direct full-sentence search no-match falls back to the catalog and resolves only the unambiguous NVDA ticker; no automatic tool-selection claim is made. Evidence: Unit and actual stdio MCP fixtures force no-match for full Chinese/English prompts, assert the exact questions reach search, verify catalog fallback retries the exact NVDA ticker, and check ambiguity/no-trade outcomes.
  - fail-closed-execution-safety (test:domain, test:plan-registry, test:execution-dry-run, test:guarded-sdk-executor): Failed or unknown market checks, altered/expired plans, insufficient funds, signature/gas mismatches and replay are rejected; rehearsals do not use a real wallet or broadcast to a network. Evidence: Deterministic plan/state and synthetic executor regressions assert rejection paths, latest-balance/allowance checks, zero network broadcasts and no real wallet.
  - standalone-sdk-onboarding (test:onboarding, test:sdk-example, test:distribution, test:cleanroom): The standalone SDK path has a reproducible local setup, example and package-consumption route with credentials kept outside source/config examples and no public release claim. Evidence: Onboarding/example/manifest assertions plus clean-room tarball install-import-use check verify the path and the local-only credential/publication boundaries.
  - existing-agent-mcp-onboarding (test:onboarding, test:mcp-config, test:mcp-live-catalog-warning): A developer can configure the stdio MCP server in an existing Agent and verify real production tool responses against the synthetic fixture; docs do not promise third-party automatic tool selection. Evidence: Config and onboarding checks are paired with actual stdio MCP discovery/comparison/research calls over loopback, while their assertions bound Agent-host selection claims.
  - provider-uncertainty-boundaries (test:phase26-limitations, test:phase27-contract, test:phase29-acceptance-evidence): The bounded provider observation and official contract remain distinct: 545 versus 488/57 stays unexplained, pagination/filter behavior remains unverified, directory fields remain absent in the sample, and no freshness SLA/completeness guarantee is claimed. Evidence: Sanitized observation, official-contract crosswalk and dedicated deferred-register/report regression assert exact counts and preserve each upstream unknown without a live re-probe.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow, test:phase29-acceptance-evidence): Phase 28 pause history and 0.890 approval remain recorded; Phase 29 advances only to delivery-complete after all checks and linked criteria pass, while low confidence or failed checks hold it. Evidence: Named sequential-gate regressions and the live evidence reconciliation verify exact phase records, prior pauses, active/terminal ledger states and the unchanged confidence floor.
  - report-reconciliation-and-local-scope (test:phase29-acceptance-evidence, test:core-product-phase-plan, test:distribution, test:jev-shadow): Technical/product reports, developer log, phase plan, deferred register and the latest Jev record agree on current approval, tested versus observed claims, remaining unknowns and the prohibition on release or other out-of-scope actions. Evidence: A dedicated regression matches the exact latest gate timestamp/transition in both interim reports, checks current phase/log/deferred summaries, and confirms the ledger remains limited to terminal local delivery.
- Jev confidence by review item: status=0.980, nextAction=1.000, riskLevel=0.990, criterion_sdk-consumer-package=0.950, criterion_provider-field-fidelity=0.940, criterion_mcp-output-native-ui-parity=0.890, criterion_natural-language-catalog-resolution=0.960, criterion_fail-closed-execution-safety=0.930, criterion_standalone-sdk-onboarding=0.830, criterion_existing-agent-mcp-onboarding=0.800, criterion_provider-uncertainty-boundaries=0.820, criterion_phase-sequence-and-terminal-ledger=0.630, criterion_report-reconciliation-and-local-scope=0.770, deferredScope=0.990
- Jev criterion findings: Criterion sdk-consumer-package: met (0.950 confidence) — A standalone developer can consume the packed SDK: package-root import, type declarations, build, distribution manifest and a search→marketContext request against a local fixture all work.; Criterion provider-field-fidelity: met (0.940 confidence) — Documented asset types, market status/reason, safe timestamps, provenance and reported market fields remain exact across SDK/domain and presentation; unknown or contradictory values remain explicit and fail closed.; Criterion mcp-output-native-ui-parity: met (0.890 confidence) — The production MCP discovery/comparison/research outputs preserve representation identity, bilingual content, structured/text parity, catalog caveats and supported market data in the same native research view.; Criterion natural-language-catalog-resolution: met (0.960 confidence) — When the host invokes the production MCP tools with full Chinese or English research questions, the direct full-sentence search no-match falls back to the catalog and resolves only the unambiguous NVDA ticker; no automatic tool-selection claim is made.; Criterion fail-closed-execution-safety: met (0.930 confidence) — Failed or unknown market checks, altered/expired plans, insufficient funds, signature/gas mismatches and replay are rejected; rehearsals do not use a real wallet or broadcast to a network.; Criterion standalone-sdk-onboarding: met (0.830 confidence) — The standalone SDK path has a reproducible local setup, example and package-consumption route with credentials kept outside source/config examples and no public release claim.; Criterion existing-agent-mcp-onboarding: met (0.800 confidence) — A developer can configure the stdio MCP server in an existing Agent and verify real production tool responses against the synthetic fixture; docs do not promise third-party automatic tool selection.; Criterion provider-uncertainty-boundaries: met (0.820 confidence) — The bounded provider observation and official contract remain distinct: 545 versus 488/57 stays unexplained, pagination/filter behavior remains unverified, directory fields remain absent in the sample, and no freshness SLA/completeness guarantee is claimed.; Criterion phase-sequence-and-terminal-ledger: met (0.630 confidence) — Phase 28 pause history and 0.890 approval remain recorded; Phase 29 advances only to delivery-complete after all checks and linked criteria pass, while low confidence or failed checks hold it.; Criterion report-reconciliation-and-local-scope: met (0.770 confidence) — Technical/product reports, developer log, phase plan, deferred register and the latest Jev record agree on current approval, tested versus observed claims, remaining unknowns and the prohibition on release or other out-of-scope actions.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T05:08:15.527Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed` / `continue` / risk `low`
- Jev: `passed` / `continue` / risk `low` / confidence `0.560`
- Agreement: `true`
- Latency: `1725 ms`
- Phase transition: `pause`
- Transition reason: Criterion existing-agent-mcp-config-contract lacks a sufficiently confident Jev review (0.840); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (typecheck, build, test:distribution, pack:check, test:cleanroom): The packed SDK builds, exposes its declared package-root types and exports, installs in a clean-room consumer, and completes search then marketContext against a local synthetic provider. Evidence: The clean-room test installs the exact packed tarball in a disposable directory, imports package exports and declarations, calls SDK search and marketContext against loopback, and asserts signed request headers and provenance; packing is dry-run only.
  - provider-field-fidelity (test:agent-model, test:domain, test:phase27-contract, test:phase28-fidelity): Source-confirmed asset type, market state and reason, timestamps, provenance and reported fields remain faithful; unknown and contradictory values stay explicit and fail closed. Evidence: Contract and synthetic runtime tests assert exact source values, unknown enums and types, invalid timestamps, contradictory market flags, identity, field-level provenance and execution blocking.
  - mcp-output-native-ui-parity (test:presentation, test:mcp-enrichment, test:mcp-app-ui, test:mcp-live-catalog-warning): Production MCP discovery, comparison and research preserve exact identity, bilingual text and structured parity, supported market evidence and catalog caveats in the bundled native read-only research view. Evidence: The production stdio server uses only a loopback synthetic provider; its three MCP tools, structured and text outputs, bilingual copy and executed native view are checked against the same fixture values.
  - natural-language-catalog-resolution (test:asset-intent-query, test:mcp-live-catalog-warning, test:demo-mode): When production MCP tools receive full Chinese or English research questions, a direct full-sentence no-match retries only the unambiguous NVDA catalog ticker; no universal Agent auto-selection claim is made. Evidence: Local unit and actual stdio subprocess fixtures capture the exact Chinese and English prompt, force provider no-match, assert catalog fallback to NVDA, and retain ambiguity and no-trade behavior without external provider requests.
  - fail-closed-execution-safety (test:domain, test:plan-registry, test:execution-dry-run, test:guarded-sdk-executor): Failed or unknown market checks, changed or expired plans, insufficient funds, invalid signature or gas and replay reject; synthetic rehearsals use no real wallet and broadcast zero transactions. Evidence: Deterministic registry, executor and rehearsal tests exercise the listed rejection paths and assert zero network broadcasts and no real-wallet use.
  - standalone-sdk-docs-example-contract (test:onboarding, test:sdk-example): The repository standalone SDK quickstart, documented search to marketContext example, runtime prerequisites, local credential handling and publication status are internally consistent. Evidence: Direct documentation and example assertions check Node version, clone/build/pack steps, exact SDK calls, credential-free example/config text, integrator approval boundary and that npm publication is not claimed; package execution is independently covered by sdk-consumer-package.
  - existing-agent-mcp-config-contract (test:onboarding, test:mcp-config, test:mcp-live-catalog-warning): Demo and Live MCP configuration examples parse to the documented stdio server commands, keep secrets local, and production handlers return expected tool results against a loopback fixture; third-party tool-selection behavior is explicitly not guaranteed. Evidence: Config and onboarding checks parse both modes and assert host-dependent selection language; a production MCP subprocess invokes discovery, comparison and research against a local fixture without external provider access.
  - provider-count-and-filter-unknowns (test:phase26-limitations, test:phase27-contract, test:phase29-acceptance-evidence): Keep the sanitized 545-declared versus 488-returned difference (57) unexplained; distinguish the official contract from sampled tab results and do not infer pagination, filter failure, or catalog completeness. Evidence: A sanitized non-secret observation and official-contract regression assert the exact counts and arithmetic; they preserve unknown pagination and tab runtime semantics, and the evidence test verifies these limits remain in reports and deferred items.
  - provider-field-and-freshness-unknowns (test:phase26-limitations, test:phase28-fidelity, test:phase29-acceptance-evidence): Do not claim per-directory quote timestamps, liquidity, complete status coverage or a freshness SLA beyond the recorded source and sample; keep unknown fields explicit in consumer outputs. Evidence: The bounded observation records absent directory fields and missing statuses; fidelity fixtures check explicit unknowns and caveats, and the report regression preserves the no-freshness-SLA boundary.
  - phase-sequence-and-terminal-ledger (test:jev-shadow, test:core-product-phase-plan, test:phase29-acceptance-evidence): Phase 29 advances only to delivery-complete when all selected checks pass and Jev scores meet 0.85; lower criterion confidence or any failed selected check leaves Phase 29 active. Evidence: Named state-machine cases directly simulate Phase 29 approval to delivery-complete, sub-0.85 criterion hold, and failed-check hold. Integration regressions reconcile real Phase 28 approval and history, current Phase 29 review, and exact terminal ledger state.
  - latest-review-report-reconciliation (test:phase29-acceptance-evidence, test:core-product-phase-plan): The exact selected Phase 29 checks, every criterion score, latest gate timestamp and decision, phase ledger, and current rework status agree across both interim reports, phase plan, development log and deferred register. Evidence: The evidence regression matches the actual latest Jev JSONL record and exact 25-check candidate, checks both report append timestamps, transitions and criterion scores, preserves both prior pause records, and reconciles active phase, successor and current rework summaries.
  - terminal-local-scope-only (test:phase29-acceptance-evidence, test:core-product-phase-plan, test:distribution, test:onboarding): Phase 29 means local acceptance only; it authorizes no provider re-probe, website change, push, release, publication, deployment, paid service, wallet signing, broadcast or settlement. Evidence: The phase plan and docs state excluded actions; distribution and onboarding regressions assert no public-release claims, while the phase ledger supports only the local delivery-complete state.
- Jev confidence by review item: status=0.560, nextAction=0.800, riskLevel=1.000, criterion_sdk-consumer-package=0.880, criterion_provider-field-fidelity=0.980, criterion_mcp-output-native-ui-parity=0.920, criterion_natural-language-catalog-resolution=0.980, criterion_fail-closed-execution-safety=0.930, criterion_standalone-sdk-docs-example-contract=0.970, criterion_existing-agent-mcp-config-contract=0.840, criterion_provider-count-and-filter-unknowns=0.940, criterion_provider-field-and-freshness-unknowns=0.970, criterion_phase-sequence-and-terminal-ledger=0.870, criterion_latest-review-report-reconciliation=0.780, criterion_terminal-local-scope-only=0.890
- Jev criterion findings: Criterion sdk-consumer-package: met (0.880 confidence) — The packed SDK builds, exposes its declared package-root types and exports, installs in a clean-room consumer, and completes search then marketContext against a local synthetic provider.; Criterion provider-field-fidelity: met (0.980 confidence) — Source-confirmed asset type, market state and reason, timestamps, provenance and reported fields remain faithful; unknown and contradictory values stay explicit and fail closed.; Criterion mcp-output-native-ui-parity: met (0.920 confidence) — Production MCP discovery, comparison and research preserve exact identity, bilingual text and structured parity, supported market evidence and catalog caveats in the bundled native read-only research view.; Criterion natural-language-catalog-resolution: met (0.980 confidence) — When production MCP tools receive full Chinese or English research questions, a direct full-sentence no-match retries only the unambiguous NVDA catalog ticker; no universal Agent auto-selection claim is made.; Criterion fail-closed-execution-safety: met (0.930 confidence) — Failed or unknown market checks, changed or expired plans, insufficient funds, invalid signature or gas and replay reject; synthetic rehearsals use no real wallet and broadcast zero transactions.; Criterion standalone-sdk-docs-example-contract: met (0.970 confidence) — The repository standalone SDK quickstart, documented search to marketContext example, runtime prerequisites, local credential handling and publication status are internally consistent.; Criterion existing-agent-mcp-config-contract: met (0.840 confidence) — Demo and Live MCP configuration examples parse to the documented stdio server commands, keep secrets local, and production handlers return expected tool results against a loopback fixture; third-party tool-selection behavior is explicitly not guaranteed.; Criterion provider-count-and-filter-unknowns: met (0.940 confidence) — Keep the sanitized 545-declared versus 488-returned difference (57) unexplained; distinguish the official contract from sampled tab results and do not infer pagination, filter failure, or catalog completeness.; Criterion provider-field-and-freshness-unknowns: met (0.970 confidence) — Do not claim per-directory quote timestamps, liquidity, complete status coverage or a freshness SLA beyond the recorded source and sample; keep unknown fields explicit in consumer outputs.; Criterion phase-sequence-and-terminal-ledger: met (0.870 confidence) — Phase 29 advances only to delivery-complete when all selected checks pass and Jev scores meet 0.85; lower criterion confidence or any failed selected check leaves Phase 29 active.; Criterion latest-review-report-reconciliation: met (0.780 confidence) — The exact selected Phase 29 checks, every criterion score, latest gate timestamp and decision, phase ledger, and current rework status agree across both interim reports, phase plan, development log and deferred register.; Criterion terminal-local-scope-only: met (0.890 confidence) — Phase 29 means local acceptance only; it authorizes no provider re-probe, website change, push, release, publication, deployment, paid service, wallet signing, broadcast or settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T05:18:56.713Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.810`
- Agreement: `true`
- Latency: `1480 ms`
- Phase transition: `pause`
- Transition reason: Criterion latest-review-report-reconciliation lacks a sufficiently confident Jev review (0.810); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (typecheck, build, pack:check, test:cleanroom): The standalone SDK package can be built, packed, installed in an isolated consumer, imported from its package root, and used for the documented search-to-market-context flow against a bounded synthetic provider. Evidence: The selected checks compile and pack the current candidate; the clean-room test installs the packed tarball, verifies package-root imports/types, then exercises search and marketContext against a loopback synthetic provider.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract, test:domain): Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated. Evidence: The source-contract, fidelity, and domain regressions assert supported values and preserve unknown/conflicting status and missing fields without synthesizing values.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP discovery/research output preserves exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view. Evidence: Selected production-shape fixtures compare structured and rendered research values, issuer representations, caveats, provenance, escaping, and read-only controls.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match can fall back only to an unambiguous catalog ticker and return read-only research without losing the original query. Evidence: A production MCP subprocess over a loopback fixture receives complete Chinese and English questions, captures exact queries, resolves only the unambiguous NVDA ticker, and asserts no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution remains fail-closed for failed or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; tests never use a real wallet or broadcast. Evidence: Synthetic execution rehearsals reject the listed unsafe cases and report zero broadcast requests and no real wallet; guarded executor and plan registry regressions cover their independent lifecycle checks.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): Standalone SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path. Evidence: SDK example, onboarding, and distribution checks verify documented local commands and API shape, consistent package metadata, and no credentials in checked-in examples.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP configuration examples parse and match the documented stdio server command; secrets remain local, and host-dependent tool-selection language is explicit. Evidence: The config and onboarding regressions parse both examples, compare launch args to package scripts, reject embedded credentials, and retain the caveat that tool selection depends on each host.
  - provider-count-and-filter-unknowns (test:phase27-contract, test:phase26-limitations): The observed 545-versus-488 provider count difference and filter/pagination semantics remain explicit unknowns; no catalog-completeness or filter-failure claim is inferred. Evidence: The official contract audit regression distinguishes declared BSC counts from unique returned identities and checks the 57 difference remains unexplained; limitation checks retain unknown filter/pagination semantics.
  - provider-field-and-freshness-unknowns (test:phase28-fidelity, test:phase26-limitations): Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA where the source does not provide them. Evidence: Source-confirmed field tests preserve absent per-directory values and unknown statuses, while limitation regressions keep freshness/completeness claims bounded to the documented endpoints.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): The phase ledger preserves history and permits Phase 29 to advance only to delivery-complete after all checks and criteria pass the unchanged 0.850 confidence floor; failure or lower confidence holds Phase 29. Evidence: The plan regression reconciles exact historical records/current phase, and Jev shadow tests Phase 29 exact approved successor, below-threshold hold, and failed-check hold paths.
  - latest-review-report-reconciliation (test:phase29-acceptance-evidence, test:core-product-phase-plan): The exact latest gate record, all criterion scores, selected-check set, phase state, development log, interim reports, plan, and deferred register reconcile without omitting known boundaries. Evidence: The acceptance-evidence regression cross-checks current ledger/history, exact check candidates, per-criterion scores in both interim reports, plan/log/deferred summaries, and the terminal local stop boundary.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 authorizes only local acceptance and reporting; it does not imply permission to probe external providers, change the website, push/publish/deploy, use a wallet, broadcast, or settle funds. Evidence: Scope regressions preserve the approved local-only boundary, state-machine non-authorization behavior, and local distribution checks; no selected command requests external writes or wallet actions.
- Jev confidence by review item: status=0.970, nextAction=0.970, riskLevel=0.990, criterion_sdk-consumer-package=0.990, criterion_provider-field-fidelity=0.970, criterion_mcp-output-native-ui-parity=0.910, criterion_natural-language-catalog-resolution=0.990, criterion_fail-closed-execution-safety=0.970, criterion_standalone-sdk-docs-example-contract=0.960, criterion_agent-mcp-config-snippets=0.990, criterion_provider-count-and-filter-unknowns=0.990, criterion_provider-field-and-freshness-unknowns=0.980, criterion_phase-sequence-and-terminal-ledger=0.900, criterion_latest-review-report-reconciliation=0.810, criterion_terminal-local-scope-only=0.960, deferredScope=0.990
- Jev criterion findings: Criterion sdk-consumer-package: met (0.990 confidence) — The standalone SDK package can be built, packed, installed in an isolated consumer, imported from its package root, and used for the documented search-to-market-context flow against a bounded synthetic provider.; Criterion provider-field-fidelity: met (0.970 confidence) — Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.910 confidence) — MCP discovery/research output preserves exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.990 confidence) — A full Chinese or English research question with no direct provider match can fall back only to an unambiguous catalog ticker and return read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.970 confidence) — Execution remains fail-closed for failed or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; tests never use a real wallet or broadcast.; Criterion standalone-sdk-docs-example-contract: met (0.960 confidence) — Standalone SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path.; Criterion agent-mcp-config-snippets: met (0.990 confidence) — Demo and Live MCP configuration examples parse and match the documented stdio server command; secrets remain local, and host-dependent tool-selection language is explicit.; Criterion provider-count-and-filter-unknowns: met (0.990 confidence) — The observed 545-versus-488 provider count difference and filter/pagination semantics remain explicit unknowns; no catalog-completeness or filter-failure claim is inferred.; Criterion provider-field-and-freshness-unknowns: met (0.980 confidence) — Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA where the source does not provide them.; Criterion phase-sequence-and-terminal-ledger: met (0.900 confidence) — The phase ledger preserves history and permits Phase 29 to advance only to delivery-complete after all checks and criteria pass the unchanged 0.850 confidence floor; failure or lower confidence holds Phase 29.; Criterion latest-review-report-reconciliation: met (0.810 confidence) — The exact latest gate record, all criterion scores, selected-check set, phase state, development log, interim reports, plan, and deferred register reconcile without omitting known boundaries.; Criterion terminal-local-scope-only: met (0.960 confidence) — Phase 29 authorizes only local acceptance and reporting; it does not imply permission to probe external providers, change the website, push/publish/deploy, use a wallet, broadcast, or settle funds.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T05:26:46.877Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.510`
- Agreement: `true`
- Latency: `1280 ms`
- Phase transition: `pause`
- Transition reason: Criterion phase-sequence-and-terminal-ledger lacks a sufficiently confident Jev review (0.810); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (typecheck, build, pack:check, test:cleanroom): The standalone SDK package can be built, packed, installed in an isolated consumer, imported from its package root, and used for the documented search-to-market-context flow against a bounded synthetic provider. Evidence: The selected checks compile and pack the current candidate; the clean-room test installs the packed tarball, verifies package-root imports/types, then exercises search and marketContext against a loopback synthetic provider.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract, test:domain): Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated. Evidence: The source-contract, fidelity, and domain regressions assert supported values and preserve unknown/conflicting status and missing fields without synthesizing values.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP discovery/research output preserves exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view. Evidence: Selected production-shape fixtures compare structured and rendered research values, issuer representations, caveats, provenance, escaping, and read-only controls.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match can fall back only to an unambiguous catalog ticker and return read-only research without losing the original query. Evidence: A production MCP subprocess over a loopback fixture receives complete Chinese and English questions, captures exact queries, resolves only the unambiguous NVDA ticker, and asserts no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution remains fail-closed for failed or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used. Evidence: Synthetic dry-run rejects the listed unsafe cases and reports zero broadcast requests/no real wallet; guarded-executor uses an injected mocked callback only, records zero network broadcasts, and tests plan-registry lifecycle/replay separately.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): Standalone SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path. Evidence: SDK example, onboarding, and distribution checks verify documented local commands and API shape, consistent package metadata, and no credentials in checked-in examples.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP configuration examples parse and match the documented stdio server command; secrets remain local, and host-dependent tool-selection language is explicit. Evidence: The config and onboarding regressions parse both examples, compare launch args to package scripts, reject embedded credentials, and retain the caveat that tool selection depends on each host.
  - provider-count-and-filter-unknowns (test:phase27-contract, test:phase26-limitations): The observed 545-versus-488 provider count difference and filter/pagination semantics remain explicit unknowns; no catalog-completeness or filter-failure claim is inferred. Evidence: The official contract audit regression distinguishes declared BSC counts from unique returned identities and checks the 57 difference remains unexplained; limitation checks retain unknown filter/pagination semantics.
  - provider-field-and-freshness-unknowns (test:phase28-fidelity, test:phase26-limitations): Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA where the source does not provide them. Evidence: Source-confirmed field tests preserve absent per-directory values and unknown statuses, while limitation regressions keep freshness/completeness claims bounded to the documented endpoints.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): The phase ledger preserves history and permits Phase 29 to advance only to delivery-complete after all checks and criteria pass the unchanged 0.850 confidence floor; failure or lower confidence holds Phase 29. Evidence: The plan regression reconciles exact historical records/current phase, and Jev shadow tests Phase 29 exact approved successor, below-threshold hold, and failed-check hold paths.
  - latest-review-report-reconciliation (test:phase29-acceptance-evidence, test:core-product-phase-plan): The latest canonical review timestamp, exact 25-check set, all 12 criterion scores, pause/successor state, deferral assessment, and latest status are consistently projected across the ledger, phase plan, both interim reports, development log, and deferred register. Evidence: The regression cross-checks the fourth canonical record and exact check names/criterion confidence against both report gate appendices, and asserts the 0.810 score, timestamp, current active phase, 12/12 met, and non-blocking deferrals in every current summary plus exact phase-state pause/successor.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 authorizes only local acceptance and reporting; it does not imply permission to probe external providers, change the website, push/publish/deploy, use a wallet, broadcast, or settle funds. Evidence: Scope regressions preserve the approved local-only boundary, state-machine non-authorization behavior, and local distribution checks; no selected command requests external writes or wallet actions.
- Jev confidence by review item: status=0.780, nextAction=0.510, riskLevel=0.990, criterion_sdk-consumer-package=0.990, criterion_provider-field-fidelity=0.960, criterion_mcp-output-native-ui-parity=0.910, criterion_natural-language-catalog-resolution=0.990, criterion_fail-closed-execution-safety=0.980, criterion_standalone-sdk-docs-example-contract=0.950, criterion_agent-mcp-config-snippets=0.990, criterion_provider-count-and-filter-unknowns=0.980, criterion_provider-field-and-freshness-unknowns=0.970, criterion_phase-sequence-and-terminal-ledger=0.810, criterion_latest-review-report-reconciliation=0.660, criterion_terminal-local-scope-only=0.950, deferredScope=0.990
- Jev criterion findings: Criterion sdk-consumer-package: met (0.990 confidence) — The standalone SDK package can be built, packed, installed in an isolated consumer, imported from its package root, and used for the documented search-to-market-context flow against a bounded synthetic provider.; Criterion provider-field-fidelity: met (0.960 confidence) — Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.910 confidence) — MCP discovery/research output preserves exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.990 confidence) — A full Chinese or English research question with no direct provider match can fall back only to an unambiguous catalog ticker and return read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.980 confidence) — Execution remains fail-closed for failed or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used.; Criterion standalone-sdk-docs-example-contract: met (0.950 confidence) — Standalone SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path.; Criterion agent-mcp-config-snippets: met (0.990 confidence) — Demo and Live MCP configuration examples parse and match the documented stdio server command; secrets remain local, and host-dependent tool-selection language is explicit.; Criterion provider-count-and-filter-unknowns: met (0.980 confidence) — The observed 545-versus-488 provider count difference and filter/pagination semantics remain explicit unknowns; no catalog-completeness or filter-failure claim is inferred.; Criterion provider-field-and-freshness-unknowns: met (0.970 confidence) — Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA where the source does not provide them.; Criterion phase-sequence-and-terminal-ledger: met (0.810 confidence) — The phase ledger preserves history and permits Phase 29 to advance only to delivery-complete after all checks and criteria pass the unchanged 0.850 confidence floor; failure or lower confidence holds Phase 29.; Criterion latest-review-report-reconciliation: met (0.660 confidence) — The latest canonical review timestamp, exact 25-check set, all 12 criterion scores, pause/successor state, deferral assessment, and latest status are consistently projected across the ledger, phase plan, both interim reports, development log, and deferred register.; Criterion terminal-local-scope-only: met (0.950 confidence) — Phase 29 authorizes only local acceptance and reporting; it does not imply permission to probe external providers, change the website, push/publish/deploy, use a wallet, broadcast, or settle funds.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T05:42:34.487Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.390`
- Agreement: `true`
- Latency: `1379 ms`
- Phase transition: `pause`
- Transition reason: Criterion phase-sequence-and-terminal-ledger lacks a sufficiently confident Jev review (0.390); clarify its evidence before advancing.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (typecheck, build, pack:check, test:cleanroom): The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider. Evidence: The checks compile and pack the candidate; clean-room installation consumes the tarball, verifies package-root imports/types, and exercises search and marketContext against a loopback synthetic provider.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract, test:domain): Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated. Evidence: Source-contract, data-fidelity, and domain regressions preserve supported values and explicitly keep unknown/conflicting status and absent fields unknown.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view. Evidence: Production-shape fixtures compare structured and rendered values, issuer representations, caveats, provenance, escaping, and read-only controls.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query. Evidence: A production MCP subprocess over a loopback fixture receives full Chinese and English questions, captures exact queries, resolves only unambiguous NVDA, and asserts no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used. Evidence: Synthetic dry-run rejects unsafe cases with zero broadcast requests/no real wallet; guarded-executor uses an injected mock callback and records zero network broadcasts; plan-registry separately tests lifecycle and replay.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path. Evidence: SDK example, onboarding, and distribution checks verify documented local commands/API shape, consistent package metadata, and no credentials in checked-in examples.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit. Evidence: Config and onboarding regressions parse both examples, compare launch arguments with package scripts, reject embedded credentials, and preserve the host-dependent selection caveat.
  - provider-count-and-filter-unknowns (test:phase27-contract, test:phase26-limitations): The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred. Evidence: The contract regression distinguishes declared BSC counts from returned identities and preserves the unexplained 57 difference; limitation checks retain unknown filter and pagination semantics.
  - provider-field-and-freshness-unknowns (test:phase28-fidelity, test:phase26-limitations): Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them. Evidence: Field tests preserve absent per-directory values and unknown statuses; limitation checks bound freshness/completeness claims to documented endpoints.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): Phase 29 advances only to delivery-complete when checks pass, every Jev criterion is met at 0.850+, and overall confidence is 0.850+; otherwise hold Phase 29 with exact pause metadata and reject any other successor. Evidence: The plan regression reconciles the real prior ledger; Jev-shadow verifies exact delivery-complete advancement, timestamp/transition/reason on low-confidence and failed-check holds, and rejection of website-release.
  - latest-review-report-reconciliation (test:phase29-acceptance-evidence, test:core-product-phase-plan): Before review, reconcile the latest previously recorded gate (not this in-flight review): exact timestamp, 25 checks, 12 criteria, pause/successor metadata, deferrals, and all report summaries; sync this review only after Jev returns. Evidence: The regression reconciles decision 2026-10-03T05:26:46.877Z, exact check names and criterion scores against both report appendices and all summaries, plus phase-state pause/successor metadata. This new gate result is appended only after Jev responds.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement. Evidence: Scope tests preserve the local-only boundary and state-machine non-authorization; distribution checks verify local packaging/consumer installation only.
- Jev confidence by review item: status=0.870, nextAction=0.610, riskLevel=0.990, criterion_sdk-consumer-package=0.970, criterion_provider-field-fidelity=0.970, criterion_mcp-output-native-ui-parity=0.920, criterion_natural-language-catalog-resolution=0.990, criterion_fail-closed-execution-safety=0.970, criterion_standalone-sdk-docs-example-contract=0.940, criterion_agent-mcp-config-snippets=0.990, criterion_provider-count-and-filter-unknowns=0.970, criterion_provider-field-and-freshness-unknowns=0.960, criterion_phase-sequence-and-terminal-ledger=0.390, criterion_latest-review-report-reconciliation=0.830, criterion_terminal-local-scope-only=0.930, deferredScope=1.000
- Jev criterion findings: Criterion sdk-consumer-package: met (0.970 confidence) — The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider.; Criterion provider-field-fidelity: met (0.970 confidence) — Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.920 confidence) — MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.990 confidence) — A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.970 confidence) — Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used.; Criterion standalone-sdk-docs-example-contract: met (0.940 confidence) — SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path.; Criterion agent-mcp-config-snippets: met (0.990 confidence) — Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit.; Criterion provider-count-and-filter-unknowns: met (0.970 confidence) — The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred.; Criterion provider-field-and-freshness-unknowns: met (0.960 confidence) — Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them.; Criterion phase-sequence-and-terminal-ledger: met (0.390 confidence) — Phase 29 advances only to delivery-complete when checks pass, every Jev criterion is met at 0.850+, and overall confidence is 0.850+; otherwise hold Phase 29 with exact pause metadata and reject any other successor.; Criterion latest-review-report-reconciliation: met (0.830 confidence) — Before review, reconcile the latest previously recorded gate (not this in-flight review): exact timestamp, 25 checks, 12 criteria, pause/successor metadata, deferrals, and all report summaries; sync this review only after Jev returns.; Criterion terminal-local-scope-only: met (0.930 confidence) — Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T05:51:16.807Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.540`
- Agreement: `true`
- Latency: `981 ms`
- Phase transition: `pause`
- Transition reason: Criterion latest-review-report-reconciliation lacks a sufficiently confident Jev review (0.540); clarify its evidence before advancing.
- Selected checks:
  - `typecheck`: passed (npm run typecheck exited 0)
  - `build`: passed (npm run build exited 0)
  - `test:agent-model`: passed (npm run test:agent-model exited 0)
  - `test:asset-intent-query`: passed (npm run test:asset-intent-query exited 0)
  - `test:domain`: passed (npm run test:domain exited 0)
  - `test:plan-registry`: passed (npm run test:plan-registry exited 0)
  - `test:execution-dry-run`: passed (npm run test:execution-dry-run exited 0)
  - `test:guarded-sdk-executor`: passed (npm run test:guarded-sdk-executor exited 0)
  - `test:presentation`: passed (npm run test:presentation exited 0)
  - `test:mcp-enrichment`: passed (npm run test:mcp-enrichment exited 0)
  - `test:mcp-app-ui`: passed (npm run test:mcp-app-ui exited 0)
  - `test:mcp-live-catalog-warning`: passed (npm run test:mcp-live-catalog-warning exited 0)
  - `test:demo-mode`: passed (npm run test:demo-mode exited 0)
  - `test:phase27-contract`: passed (npm run test:phase27-contract exited 0)
  - `test:phase28-fidelity`: passed (npm run test:phase28-fidelity exited 0)
  - `test:phase26-limitations`: passed (npm run test:phase26-limitations exited 0)
  - `test:onboarding`: passed (npm run test:onboarding exited 0)
  - `test:mcp-config`: passed (npm run test:mcp-config exited 0)
  - `test:sdk-example`: passed (npm run test:sdk-example exited 0)
  - `test:distribution`: passed (npm run test:distribution exited 0)
  - `pack:check`: passed (npm run pack:check exited 0)
  - `test:cleanroom`: passed (npm run test:cleanroom exited 0)
  - `test:phase29-acceptance-evidence`: passed (npm run test:phase29-acceptance-evidence exited 0)
  - `test:core-product-phase-plan`: passed (npm run test:core-product-phase-plan exited 0)
  - `test:jev-shadow`: passed (npm run test:jev-shadow exited 0)
- Deferred assessment: `non_blocking`
- Deferred items:
  - Provider catalog coverage/count, pagination/filter semantics, freshness SLA, and the observed 545-versus-488 difference remain unresolved; this phase includes no new provider probe.
  - Third-party Agent tool-selection and pixel-level rendering across all hosts are unverified; fixtures and current-host observation do not establish universal behavior.
  - Website visual refinement and website completion are excluded from this terminal core-product phase.
  - npm/MCP Registry publication, hosted deployment, public push, and public release are excluded; only local packing and clean-room consumption are covered.
  - Real-wallet signing, funded broadcast, and on-chain settlement are excluded; selected tests use synthetic inputs and report zero live broadcasts.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (typecheck, build, pack:check, test:cleanroom): The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider. Evidence: The checks compile and pack the candidate; clean-room installation consumes the tarball, verifies package-root imports/types, and exercises search and marketContext against a loopback synthetic provider.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract, test:domain): Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated. Evidence: Source-contract, data-fidelity, and domain regressions preserve supported values and explicitly keep unknown/conflicting status and absent fields unknown.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view. Evidence: Production-shape fixtures compare structured and rendered values, issuer representations, caveats, provenance, escaping, and read-only controls.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query. Evidence: A production MCP subprocess over a loopback fixture receives full Chinese and English questions, captures exact queries, resolves only unambiguous NVDA, and asserts no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used. Evidence: Synthetic dry-run rejects unsafe cases with zero broadcast requests/no real wallet; guarded-executor uses an injected mock callback and records zero network broadcasts; plan-registry separately tests lifecycle and replay.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path. Evidence: SDK example, onboarding, and distribution checks verify documented local commands/API shape, consistent package metadata, and no credentials in checked-in examples.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit. Evidence: Config and onboarding regressions parse both examples, compare launch arguments with package scripts, reject embedded credentials, and preserve the host-dependent selection caveat.
  - provider-count-and-filter-unknowns (test:phase27-contract, test:phase26-limitations): The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred. Evidence: The contract regression distinguishes declared BSC counts from returned identities and preserves the unexplained 57 difference; limitation checks retain unknown filter and pagination semantics.
  - provider-field-and-freshness-unknowns (test:phase28-fidelity, test:phase26-limitations): Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them. Evidence: Field tests preserve absent per-directory values and unknown statuses; limitation checks bound freshness/completeness claims to documented endpoints.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): An approved Phase 29 decision advances currentPhase and nextPhase to delivery-complete; a pause keeps sdk-mcp-final-acceptance current, preserves delivery-complete as successor and records decision metadata; reject any other successor. Evidence: The Jev-shadow test simulates an approved decision, a below-threshold criterion and a failed check; it asserts exact current/next phase, lastTransition, lastDecisionAt and lastReason, and rejects website-release. The plan regression checks actual ledger history.
  - latest-review-report-reconciliation (test:phase29-acceptance-evidence, test:core-product-phase-plan): Before review, the latest prior gate's timestamp, 25 checks, 12 criterion scores, decision/phase state and deferrals match report appendices and five current summaries; append this in-flight result only after review. Evidence: The evidence regression compares the latest JSONL decision with phase-state and both report appendices, every check and criterion score; it requires all five summaries to echo prior timestamp, blocker scores, phase/successor and pause. The runner appends a new Jev outcome only after its response.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement. Evidence: Scope tests preserve the local-only boundary and state-machine non-authorization; distribution checks verify local packaging and consumer installation only.
- Jev confidence by review item: status=0.930, nextAction=0.920, riskLevel=0.990, criterion_sdk-consumer-package=0.990, criterion_provider-field-fidelity=0.980, criterion_mcp-output-native-ui-parity=0.950, criterion_natural-language-catalog-resolution=0.990, criterion_fail-closed-execution-safety=0.980, criterion_standalone-sdk-docs-example-contract=0.930, criterion_agent-mcp-config-snippets=0.990, criterion_provider-count-and-filter-unknowns=0.980, criterion_provider-field-and-freshness-unknowns=0.970, criterion_phase-sequence-and-terminal-ledger=0.930, criterion_latest-review-report-reconciliation=0.540, criterion_terminal-local-scope-only=0.930, deferredScope=0.990
- Jev criterion findings: Criterion sdk-consumer-package: met (0.990 confidence) — The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider.; Criterion provider-field-fidelity: met (0.980 confidence) — Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.950 confidence) — MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.990 confidence) — A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.980 confidence) — Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used.; Criterion standalone-sdk-docs-example-contract: met (0.930 confidence) — SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path.; Criterion agent-mcp-config-snippets: met (0.990 confidence) — Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit.; Criterion provider-count-and-filter-unknowns: met (0.980 confidence) — The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred.; Criterion provider-field-and-freshness-unknowns: met (0.970 confidence) — Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them.; Criterion phase-sequence-and-terminal-ledger: met (0.930 confidence) — An approved Phase 29 decision advances currentPhase and nextPhase to delivery-complete; a pause keeps sdk-mcp-final-acceptance current, preserves delivery-complete as successor and records decision metadata; reject any other successor.; Criterion latest-review-report-reconciliation: met (0.540 confidence) — Before review, the latest prior gate's timestamp, 25 checks, 12 criterion scores, decision/phase state and deferrals match report appendices and five current summaries; append this in-flight result only after review.; Criterion terminal-local-scope-only: met (0.930 confidence) — Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T05:59:28.856Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.380`
- Agreement: `true`
- Latency: `1690 ms`
- Phase transition: `pause`
- Transition reason: Criterion latest-review-report-reconciliation lacks a sufficiently confident Jev review (0.380); clarify its evidence before advancing.
- Selected checks:
  - `typecheck`: passed (npm run typecheck exited 0)
  - `build`: passed (npm run build exited 0)
  - `test:agent-model`: passed (npm run test:agent-model exited 0)
  - `test:asset-intent-query`: passed (npm run test:asset-intent-query exited 0)
  - `test:domain`: passed (npm run test:domain exited 0)
  - `test:plan-registry`: passed (npm run test:plan-registry exited 0)
  - `test:execution-dry-run`: passed (npm run test:execution-dry-run exited 0)
  - `test:guarded-sdk-executor`: passed (npm run test:guarded-sdk-executor exited 0)
  - `test:presentation`: passed (npm run test:presentation exited 0)
  - `test:mcp-enrichment`: passed (npm run test:mcp-enrichment exited 0)
  - `test:mcp-app-ui`: passed (npm run test:mcp-app-ui exited 0)
  - `test:mcp-live-catalog-warning`: passed (npm run test:mcp-live-catalog-warning exited 0)
  - `test:demo-mode`: passed (npm run test:demo-mode exited 0)
  - `test:phase27-contract`: passed (npm run test:phase27-contract exited 0)
  - `test:phase28-fidelity`: passed (npm run test:phase28-fidelity exited 0)
  - `test:phase26-limitations`: passed (npm run test:phase26-limitations exited 0)
  - `test:onboarding`: passed (npm run test:onboarding exited 0)
  - `test:mcp-config`: passed (npm run test:mcp-config exited 0)
  - `test:sdk-example`: passed (npm run test:sdk-example exited 0)
  - `test:distribution`: passed (npm run test:distribution exited 0)
  - `pack:check`: passed (npm run pack:check exited 0)
  - `test:cleanroom`: passed (npm run test:cleanroom exited 0)
  - `test:phase29-acceptance-evidence`: passed (npm run test:phase29-acceptance-evidence exited 0)
  - `test:core-product-phase-plan`: passed (npm run test:core-product-phase-plan exited 0)
  - `test:jev-shadow`: passed (npm run test:jev-shadow exited 0)
- Deferred assessment: `non_blocking`
- Deferred items:
  - Provider catalog coverage/count, pagination/filter semantics, freshness SLA, and the observed 545-versus-488 difference remain unresolved; this phase includes no new provider probe.
  - Third-party Agent tool-selection and pixel-level rendering across all hosts are unverified; fixtures and current-host observation do not establish universal behavior.
  - Website visual refinement and website completion are excluded from this terminal core-product phase.
  - npm/MCP Registry publication, hosted deployment, public push, and public release are excluded; only local packing and clean-room consumption are covered.
  - Real-wallet signing, funded broadcast, and on-chain settlement are excluded; selected tests use synthetic inputs and report zero live broadcasts.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (typecheck, build, pack:check, test:cleanroom): The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider. Evidence: The checks compile and pack the candidate; clean-room installation consumes the tarball, verifies package-root imports/types, and exercises search and marketContext against a loopback synthetic provider.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract, test:domain): Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated. Evidence: Source-contract, data-fidelity, and domain regressions preserve supported values and explicitly keep unknown/conflicting status and absent fields unknown.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view. Evidence: Production-shape fixtures compare structured and rendered values, issuer representations, caveats, provenance, escaping, and read-only controls.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query. Evidence: A production MCP subprocess over a loopback fixture receives full Chinese and English questions, captures exact queries, resolves only unambiguous NVDA, and asserts no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used. Evidence: Synthetic dry-run rejects unsafe cases with zero broadcast requests/no real wallet; guarded-executor uses an injected mock callback and records zero network broadcasts; plan-registry separately tests lifecycle and replay.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path. Evidence: SDK example, onboarding, and distribution checks verify documented local commands/API shape, consistent package metadata, and no credentials in checked-in examples.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit. Evidence: Config and onboarding regressions parse both examples, compare launch arguments with package scripts, reject embedded credentials, and preserve the host-dependent selection caveat.
  - provider-count-and-filter-unknowns (test:phase27-contract, test:phase26-limitations): The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred. Evidence: The contract regression distinguishes declared BSC counts from returned identities and preserves the unexplained 57 difference; limitation checks retain unknown filter and pagination semantics.
  - provider-field-and-freshness-unknowns (test:phase28-fidelity, test:phase26-limitations): Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them. Evidence: Field tests preserve absent per-directory values and unknown statuses; limitation checks bound freshness/completeness claims to documented endpoints.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): An approved Phase 29 decision advances currentPhase and nextPhase to delivery-complete; a pause keeps sdk-mcp-final-acceptance current, preserves delivery-complete as successor and records decision metadata; reject any other successor. Evidence: The Jev-shadow test simulates an approved decision, a below-threshold criterion and a failed check; it asserts exact current/next phase, lastTransition, lastDecisionAt and lastReason, and rejects website-release. The plan regression checks actual ledger history.
  - latest-review-report-reconciliation (test:phase29-acceptance-evidence, test:core-product-phase-plan): Before review, the latest prior gate's timestamp, 25 checks, 12 criterion scores, decision/phase state and deferrals match report appendices and five current summaries; append this in-flight result only after review. Evidence: The evidence regression compares the latest JSONL decision with phase-state and both report appendices, every check and criterion score; it requires all five summaries to echo prior timestamp, blocker scores, phase/successor and pause. The runner appends a new Jev outcome only after its response.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement. Evidence: Scope tests preserve the local-only boundary and state-machine non-authorization; distribution checks verify local packaging and consumer installation only.
- Jev confidence by review item: status=0.920, nextAction=0.660, riskLevel=0.990, criterion_sdk-consumer-package=0.970, criterion_provider-field-fidelity=0.960, criterion_mcp-output-native-ui-parity=0.890, criterion_natural-language-catalog-resolution=0.970, criterion_fail-closed-execution-safety=0.980, criterion_standalone-sdk-docs-example-contract=0.940, criterion_agent-mcp-config-snippets=0.990, criterion_provider-count-and-filter-unknowns=0.970, criterion_provider-field-and-freshness-unknowns=0.960, criterion_phase-sequence-and-terminal-ledger=0.910, criterion_latest-review-report-reconciliation=0.380, criterion_terminal-local-scope-only=0.900, deferredScope=0.990
- Jev criterion findings: Criterion sdk-consumer-package: met (0.970 confidence) — The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider.; Criterion provider-field-fidelity: met (0.960 confidence) — Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.890 confidence) — MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.970 confidence) — A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.980 confidence) — Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used.; Criterion standalone-sdk-docs-example-contract: met (0.940 confidence) — SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path.; Criterion agent-mcp-config-snippets: met (0.990 confidence) — Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit.; Criterion provider-count-and-filter-unknowns: met (0.970 confidence) — The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred.; Criterion provider-field-and-freshness-unknowns: met (0.960 confidence) — Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them.; Criterion phase-sequence-and-terminal-ledger: met (0.910 confidence) — An approved Phase 29 decision advances currentPhase and nextPhase to delivery-complete; a pause keeps sdk-mcp-final-acceptance current, preserves delivery-complete as successor and records decision metadata; reject any other successor.; Criterion latest-review-report-reconciliation: met (0.380 confidence) — Before review, the latest prior gate's timestamp, 25 checks, 12 criterion scores, decision/phase state and deferrals match report appendices and five current summaries; append this in-flight result only after review.; Criterion terminal-local-scope-only: met (0.900 confidence) — Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T06:12:50.236Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.650`
- Agreement: `true`
- Latency: `1257 ms`
- Phase transition: `pause`
- Transition reason: Criterion latest-review-report-reconciliation lacks a sufficiently confident Jev review (0.650); clarify its evidence before advancing.
- Selected checks:
  - `typecheck`: passed (npm run typecheck exited 0)
  - `build`: passed (npm run build exited 0)
  - `test:agent-model`: passed (npm run test:agent-model exited 0)
  - `test:asset-intent-query`: passed (npm run test:asset-intent-query exited 0)
  - `test:domain`: passed (npm run test:domain exited 0)
  - `test:plan-registry`: passed (npm run test:plan-registry exited 0)
  - `test:execution-dry-run`: passed (npm run test:execution-dry-run exited 0)
  - `test:guarded-sdk-executor`: passed (npm run test:guarded-sdk-executor exited 0)
  - `test:presentation`: passed (npm run test:presentation exited 0)
  - `test:mcp-enrichment`: passed (npm run test:mcp-enrichment exited 0)
  - `test:mcp-app-ui`: passed (npm run test:mcp-app-ui exited 0)
  - `test:mcp-live-catalog-warning`: passed (npm run test:mcp-live-catalog-warning exited 0)
  - `test:demo-mode`: passed (npm run test:demo-mode exited 0)
  - `test:phase27-contract`: passed (npm run test:phase27-contract exited 0)
  - `test:phase28-fidelity`: passed (npm run test:phase28-fidelity exited 0)
  - `test:phase26-limitations`: passed (npm run test:phase26-limitations exited 0)
  - `test:onboarding`: passed (npm run test:onboarding exited 0)
  - `test:mcp-config`: passed (npm run test:mcp-config exited 0)
  - `test:sdk-example`: passed (npm run test:sdk-example exited 0)
  - `test:distribution`: passed (npm run test:distribution exited 0)
  - `pack:check`: passed (npm run pack:check exited 0)
  - `test:cleanroom`: passed (npm run test:cleanroom exited 0)
  - `test:phase29-acceptance-evidence`: passed (npm run test:phase29-acceptance-evidence exited 0)
  - `test:core-product-phase-plan`: passed (npm run test:core-product-phase-plan exited 0)
  - `test:jev-shadow`: passed (npm run test:jev-shadow exited 0)
- Deferred assessment: `non_blocking`
- Deferred items:
  - Provider catalog coverage/count, pagination/filter semantics, freshness SLA, and the observed 545-versus-488 difference remain unresolved; this phase includes no new provider probe.
  - Third-party Agent tool-selection and pixel-level rendering across all hosts are unverified; fixtures and current-host observation do not establish universal behavior.
  - Website visual refinement and website completion are excluded from this terminal core-product phase.
  - npm/MCP Registry publication, hosted deployment, public push, and public release are excluded; only local packing and clean-room consumption are covered.
  - Real-wallet signing, funded broadcast, and on-chain settlement are excluded; selected tests use synthetic inputs and report zero live broadcasts.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (typecheck, build, pack:check, test:cleanroom): The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider. Evidence: The checks compile and pack the candidate; clean-room installation consumes the tarball, verifies package-root imports/types, and exercises search and marketContext against a loopback synthetic provider.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract, test:domain): Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated. Evidence: Source-contract, data-fidelity, and domain regressions preserve supported values and explicitly keep unknown/conflicting status and absent fields unknown.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view. Evidence: Production-shape fixtures compare structured and rendered values, issuer representations, caveats, provenance, escaping, and read-only controls.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query. Evidence: A production MCP subprocess over a loopback fixture receives full Chinese and English questions, captures exact queries, resolves only unambiguous NVDA, and asserts no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used. Evidence: Synthetic dry-run rejects unsafe cases with zero broadcast requests/no real wallet; guarded-executor uses an injected mock callback and records zero network broadcasts; plan-registry separately tests lifecycle and replay.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path. Evidence: SDK example, onboarding, and distribution checks verify documented local commands/API shape, consistent package metadata, and no credentials in checked-in examples.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit. Evidence: Config and onboarding regressions parse both examples, compare launch arguments with package scripts, reject embedded credentials, and preserve the host-dependent selection caveat.
  - provider-count-and-filter-unknowns (test:phase27-contract, test:phase26-limitations): The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred. Evidence: The contract regression distinguishes declared BSC counts from returned identities and preserves the unexplained 57 difference; limitation checks retain unknown filter and pagination semantics.
  - provider-field-and-freshness-unknowns (test:phase28-fidelity, test:phase26-limitations): Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them. Evidence: Field tests preserve absent per-directory values and unknown statuses; limitation checks bound freshness/completeness claims to documented endpoints.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): An approved Phase 29 decision advances to delivery-complete; a pause holds Phase 29 and its exact successor with decision metadata; any other successor is rejected. Evidence: The shadow-gate tests approve/hold/reject and assert exact current/next phases plus decision metadata; the plan regression validates canonical history.
  - latest-review-report-reconciliation (test:phase29-acceptance-evidence, test:core-product-phase-plan): Before review, both report appendices match the latest prior gate's checks, scores, decision and deferrals; all five current summaries match one generated snapshot with the exact timestamp, criterion scores, floor gaps, counts and ledger state. Evidence: The regression compares the latest JSONL record with phase-state, both appendices including each check, score and exact deferral, and the complete rendered snapshot in all five summaries. A temporary fixture verifies sync insertion and idempotent replacement; the gate runner invokes synchronization after each Jev response.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement. Evidence: Scope tests preserve the local-only boundary and state-machine non-authorization; distribution checks verify local packaging and consumer installation only.
- Jev confidence by review item: status=0.930, nextAction=0.860, riskLevel=0.990, criterion_sdk-consumer-package=0.970, criterion_provider-field-fidelity=0.950, criterion_mcp-output-native-ui-parity=0.920, criterion_natural-language-catalog-resolution=0.970, criterion_fail-closed-execution-safety=0.960, criterion_standalone-sdk-docs-example-contract=0.930, criterion_agent-mcp-config-snippets=0.980, criterion_provider-count-and-filter-unknowns=0.970, criterion_provider-field-and-freshness-unknowns=0.960, criterion_phase-sequence-and-terminal-ledger=0.900, criterion_latest-review-report-reconciliation=0.650, criterion_terminal-local-scope-only=0.900, deferredScope=0.990
- Jev criterion findings: Criterion sdk-consumer-package: met (0.970 confidence) — The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider.; Criterion provider-field-fidelity: met (0.950 confidence) — Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.920 confidence) — MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.970 confidence) — A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.960 confidence) — Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used.; Criterion standalone-sdk-docs-example-contract: met (0.930 confidence) — SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path.; Criterion agent-mcp-config-snippets: met (0.980 confidence) — Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit.; Criterion provider-count-and-filter-unknowns: met (0.970 confidence) — The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred.; Criterion provider-field-and-freshness-unknowns: met (0.960 confidence) — Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them.; Criterion phase-sequence-and-terminal-ledger: met (0.900 confidence) — An approved Phase 29 decision advances to delivery-complete; a pause holds Phase 29 and its exact successor with decision metadata; any other successor is rejected.; Criterion latest-review-report-reconciliation: met (0.650 confidence) — Before review, both report appendices match the latest prior gate's checks, scores, decision and deferrals; all five current summaries match one generated snapshot with the exact timestamp, criterion scores, floor gaps, counts and ledger state.; Criterion terminal-local-scope-only: met (0.900 confidence) — Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T06:19:24.670Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.760`
- Agreement: `true`
- Latency: `1084 ms`
- Phase transition: `pause`
- Transition reason: Criterion latest-review-report-reconciliation lacks a sufficiently confident Jev review (0.760); clarify its evidence before advancing.
- Selected checks:
  - `typecheck`: passed (npm run typecheck exited 0)
  - `build`: passed (npm run build exited 0)
  - `test:agent-model`: passed (npm run test:agent-model exited 0)
  - `test:asset-intent-query`: passed (npm run test:asset-intent-query exited 0)
  - `test:domain`: passed (npm run test:domain exited 0)
  - `test:plan-registry`: passed (npm run test:plan-registry exited 0)
  - `test:execution-dry-run`: passed (npm run test:execution-dry-run exited 0)
  - `test:guarded-sdk-executor`: passed (npm run test:guarded-sdk-executor exited 0)
  - `test:presentation`: passed (npm run test:presentation exited 0)
  - `test:mcp-enrichment`: passed (npm run test:mcp-enrichment exited 0)
  - `test:mcp-app-ui`: passed (npm run test:mcp-app-ui exited 0)
  - `test:mcp-live-catalog-warning`: passed (npm run test:mcp-live-catalog-warning exited 0)
  - `test:demo-mode`: passed (npm run test:demo-mode exited 0)
  - `test:phase27-contract`: passed (npm run test:phase27-contract exited 0)
  - `test:phase28-fidelity`: passed (npm run test:phase28-fidelity exited 0)
  - `test:phase26-limitations`: passed (npm run test:phase26-limitations exited 0)
  - `test:onboarding`: passed (npm run test:onboarding exited 0)
  - `test:mcp-config`: passed (npm run test:mcp-config exited 0)
  - `test:sdk-example`: passed (npm run test:sdk-example exited 0)
  - `test:distribution`: passed (npm run test:distribution exited 0)
  - `pack:check`: passed (npm run pack:check exited 0)
  - `test:cleanroom`: passed (npm run test:cleanroom exited 0)
  - `test:phase29-acceptance-evidence`: passed (npm run test:phase29-acceptance-evidence exited 0)
  - `test:core-product-phase-plan`: passed (npm run test:core-product-phase-plan exited 0)
  - `test:jev-shadow`: passed (npm run test:jev-shadow exited 0)
- Deferred assessment: `non_blocking`
- Deferred items:
  - Provider catalog coverage/count, pagination/filter semantics, freshness SLA, and the observed 545-versus-488 difference remain unresolved; this phase includes no new provider probe.
  - Third-party Agent tool-selection and pixel-level rendering across all hosts are unverified; fixtures and current-host observation do not establish universal behavior.
  - Website visual refinement and website completion are excluded from this terminal core-product phase.
  - npm/MCP Registry publication, hosted deployment, public push, and public release are excluded; only local packing and clean-room consumption are covered.
  - Real-wallet signing, funded broadcast, and on-chain settlement are excluded; selected tests use synthetic inputs and report zero live broadcasts.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (typecheck, build, pack:check, test:cleanroom): The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider. Evidence: The checks compile and pack the candidate; clean-room installation consumes the tarball, verifies package-root imports/types, and exercises search and marketContext against a loopback synthetic provider.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract, test:domain): Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated. Evidence: Source-contract, data-fidelity, and domain regressions preserve supported values and explicitly keep unknown/conflicting status and absent fields unknown.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view. Evidence: Production-shape fixtures compare structured and rendered values, issuer representations, caveats, provenance, escaping, and read-only controls.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query. Evidence: A production MCP subprocess over a loopback fixture receives full Chinese and English questions, captures exact queries, resolves only unambiguous NVDA, and asserts no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used. Evidence: Synthetic dry-run rejects unsafe cases with zero broadcast requests/no real wallet; guarded-executor uses an injected mock callback and records zero network broadcasts; plan-registry separately tests lifecycle and replay.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path. Evidence: SDK example, onboarding, and distribution checks verify documented local commands/API shape, consistent package metadata, and no credentials in checked-in examples.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit. Evidence: Config and onboarding regressions parse both examples, compare launch arguments with package scripts, reject embedded credentials, and preserve the host-dependent selection caveat.
  - provider-count-and-filter-unknowns (test:phase27-contract, test:phase26-limitations): The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred. Evidence: The contract regression distinguishes declared BSC counts from returned identities and preserves the unexplained 57 difference; limitation checks retain unknown filter and pagination semantics.
  - provider-field-and-freshness-unknowns (test:phase28-fidelity, test:phase26-limitations): Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them. Evidence: Field tests preserve absent per-directory values and unknown statuses; limitation checks bound freshness/completeness claims to documented endpoints.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): An approved Phase 29 decision advances to delivery-complete; a pause holds Phase 29 and its exact successor with decision metadata; any other successor is rejected. Evidence: The shadow-gate tests approve/hold/reject and assert exact current/next phases plus decision metadata; the plan regression validates canonical history.
  - latest-review-report-reconciliation (test:phase29-acceptance-evidence, test:core-product-phase-plan): Both report appendices must match the prior gate's exact checks, scores, decision and deferrals; each of five summaries must have one identical generated snapshot and no conflicting hand-maintained current-state prose. Evidence: The regression compares the latest ledger entry to phase-state and both appendices, verifies the full generated snapshot in all five summaries, rejects duplicate blocks and stale status text, and tests sync idempotency. The plan regression confirms the gate runner writes all five snapshots after each Jev response.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement. Evidence: Scope tests preserve the local-only boundary and state-machine non-authorization; distribution checks verify local packaging and consumer installation only.
- Jev confidence by review item: status=0.940, nextAction=0.880, riskLevel=0.990, criterion_sdk-consumer-package=0.980, criterion_provider-field-fidelity=0.950, criterion_mcp-output-native-ui-parity=0.920, criterion_natural-language-catalog-resolution=0.970, criterion_fail-closed-execution-safety=0.970, criterion_standalone-sdk-docs-example-contract=0.900, criterion_agent-mcp-config-snippets=0.990, criterion_provider-count-and-filter-unknowns=0.970, criterion_provider-field-and-freshness-unknowns=0.970, criterion_phase-sequence-and-terminal-ledger=0.920, criterion_latest-review-report-reconciliation=0.760, criterion_terminal-local-scope-only=0.900, deferredScope=0.990
- Jev criterion findings: Criterion sdk-consumer-package: met (0.980 confidence) — The standalone SDK builds, packs, installs in an isolated consumer, imports from its package root, and supports the documented search-to-market-context flow against a synthetic provider.; Criterion provider-field-fidelity: met (0.950 confidence) — Provider-backed asset identity, status, timestamps, provenance, and reported fields remain faithful; unknown or contradictory values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.920 confidence) — MCP discovery and research preserve exact representation identity and parity between natural-language text, structured content, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.970 confidence) — A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.970 confidence) — Execution stays fail-closed for failed/changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live network broadcast is used.; Criterion standalone-sdk-docs-example-contract: met (0.900 confidence) — SDK setup, example, package metadata, credential handling, and publication-status documentation match the executable local consumer path.; Criterion agent-mcp-config-snippets: met (0.990 confidence) — Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit.; Criterion provider-count-and-filter-unknowns: met (0.970 confidence) — The observed 545-versus-488 provider count difference and filter/pagination semantics remain unknown; no catalog-completeness or filter-failure claim is inferred.; Criterion provider-field-and-freshness-unknowns: met (0.970 confidence) — Do not claim directory-level quote timestamps, liquidity, complete status coverage, or a freshness SLA when the source does not provide them.; Criterion phase-sequence-and-terminal-ledger: met (0.920 confidence) — An approved Phase 29 decision advances to delivery-complete; a pause holds Phase 29 and its exact successor with decision metadata; any other successor is rejected.; Criterion latest-review-report-reconciliation: met (0.760 confidence) — Both report appendices must match the prior gate's exact checks, scores, decision and deferrals; each of five summaries must have one identical generated snapshot and no conflicting hand-maintained current-state prose.; Criterion terminal-local-scope-only: met (0.900 confidence) — Phase 29 covers local acceptance/reporting only; it grants no authority for provider probes, website changes, push/publication/deployment, wallet use, broadcast, or settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T06:26:38.003Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.850`
- Agreement: `true`
- Latency: `1334 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Selected checks:
  - `typecheck`: passed (npm run typecheck exited 0)
  - `build`: passed (npm run build exited 0)
  - `test:agent-model`: passed (npm run test:agent-model exited 0)
  - `test:asset-intent-query`: passed (npm run test:asset-intent-query exited 0)
  - `test:domain`: passed (npm run test:domain exited 0)
  - `test:plan-registry`: passed (npm run test:plan-registry exited 0)
  - `test:execution-dry-run`: passed (npm run test:execution-dry-run exited 0)
  - `test:guarded-sdk-executor`: passed (npm run test:guarded-sdk-executor exited 0)
  - `test:presentation`: passed (npm run test:presentation exited 0)
  - `test:mcp-enrichment`: passed (npm run test:mcp-enrichment exited 0)
  - `test:mcp-app-ui`: passed (npm run test:mcp-app-ui exited 0)
  - `test:mcp-live-catalog-warning`: passed (npm run test:mcp-live-catalog-warning exited 0)
  - `test:demo-mode`: passed (npm run test:demo-mode exited 0)
  - `test:phase27-contract`: passed (npm run test:phase27-contract exited 0)
  - `test:phase28-fidelity`: passed (npm run test:phase28-fidelity exited 0)
  - `test:phase26-limitations`: passed (npm run test:phase26-limitations exited 0)
  - `test:onboarding`: passed (npm run test:onboarding exited 0)
  - `test:mcp-config`: passed (npm run test:mcp-config exited 0)
  - `test:sdk-example`: passed (npm run test:sdk-example exited 0)
  - `test:distribution`: passed (npm run test:distribution exited 0)
  - `pack:check`: passed (npm run pack:check exited 0)
  - `test:cleanroom`: passed (npm run test:cleanroom exited 0)
  - `test:phase29-acceptance-evidence`: passed (npm run test:phase29-acceptance-evidence exited 0)
  - `test:core-product-phase-plan`: passed (npm run test:core-product-phase-plan exited 0)
  - `test:jev-shadow`: passed (npm run test:jev-shadow exited 0)
- Deferred assessment: `non_blocking`
- Deferred items:
  - Provider inventory count, pagination/filter semantics, freshness SLA and the observed 545-versus-488 difference remain unresolved; no new provider probe is included.
  - Third-party Agent tool selection and pixel-level rendering across every host remain unverified.
  - Website visual refinement and completion are outside this phase.
  - npm/MCP Registry publication, hosted deployment, public push or release are outside this phase; only local packing and clean-room installation are checked.
  - Real-wallet signing, funded broadcast and on-chain settlement are outside this phase; all execution evidence is synthetic and records zero live broadcasts.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (test:cleanroom, test:sdk-example, test:distribution): The standalone SDK packs, installs in an isolated consumer, imports from its package root, and supports documented search-to-market-context research. Evidence: The clean-room test packs and installs the tarball, imports the SDK from its package root, and performs search followed by marketContext against synthetic data; SDK example and distribution tests cross-check the documented consumer path.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract): Provider-backed identity, status, timestamps, provenance, and reported fields stay faithful; absent, unknown, or contradictory source values are not fabricated. Evidence: Contract and fidelity fixtures compare normalized representation identity and source fields against captured provider contracts, preserve source provenance and missing values, and reject fabricated or contradictory values.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP research preserves exact representation identity and equivalent information across text, structuredContent, and the bundled read-only native research view. Evidence: Production-shaped fixtures compare structured and rendered values, issuer representations, caveats, provenance, escaping, and read-only controls across the MCP and bundled app surfaces.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query. Evidence: A production MCP subprocess on a loopback fixture receives full Chinese and English questions, captures exact queries, resolves only unambiguous NVDA, and asserts research-only behavior with no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution rejects unsafe or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live broadcast is used. Evidence: Synthetic dry-run and guarded-executor tests reject unsafe cases; they assert zero broadcast requests and no real wallet, while plan-registry covers lifecycle, replay, and invalid transitions.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): SDK setup, runnable example, package metadata, credential handling, and publication-status documentation match the verified local consumer path. Evidence: SDK example, onboarding, and distribution regressions verify documented local commands and API shape, consistent package metadata, no checked-in credentials, and explicit non-publication status.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit. Evidence: Configuration and onboarding tests parse both examples, compare launch arguments with package scripts, reject embedded secrets, and preserve the caveat that each host controls tool selection.
  - provider-unknowns-remain-explicit (test:phase27-contract, test:phase26-limitations, test:phase28-fidelity): Keep the 545-record versus 488-representation count gap, filter/pagination semantics, directory quote timestamps/liquidity, status coverage, and freshness SLA unknown; do not claim catalog completeness or unsupported fields. Evidence: The source-contract, limitation, and fidelity regressions retain the unexplained 57-count difference and unknown filter/pagination behavior, and prevent claims of missing directory-level timestamps, liquidity, complete status coverage, freshness SLA, or catalog completeness.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): A qualifying Phase 29 approval advances only to delivery-complete; a pause holds Phase 29 and its named successor with decision metadata; any other successor is rejected. Evidence: Phase-state tests approve, hold, and reject exact transitions and successors; plan regressions verify Phase 29 scope and the ordered roadmap.
  - latest-report-appendix-integrity (test:phase29-acceptance-evidence): Before review, both report appendices exactly reproduce the latest prior gate decision, phase metadata, every selected-check outcome, all criterion scores, and exact deferred items. Evidence: The evidence regression compares the canonical JSONL decision with phase-state and each technical/product appendix, including timestamp, transition, all selected checks and outcomes, criterion confidence values, deferred assessment, and exact deferred-item text.
  - single-current-summary-source (test:phase29-acceptance-evidence, test:core-product-phase-plan): All five current summaries show exactly one snapshot matching the latest prior gate; no stale duplicate current-state prose remains, and each new decision is synchronized automatically. Evidence: The evidence regression compares the complete generated block in five files with the canonical record, rejects duplicate blocks and stale current prose, exercises idempotent insertion/replacement, and verifies the gate runner synchronizes each response.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 is limited to local acceptance and reporting; it does not authorize provider probes, website edits, push/publication/deployment, wallet use, broadcast, or settlement. Evidence: Scope regressions keep external and high-risk actions unauthorized, while distribution tests verify local packaging and consumer installation without publishing.
- Jev confidence by review item: status=0.980, nextAction=0.980, riskLevel=1.000, criterion_sdk-consumer-package=1.000, criterion_provider-field-fidelity=0.990, criterion_mcp-output-native-ui-parity=0.970, criterion_natural-language-catalog-resolution=0.990, criterion_fail-closed-execution-safety=0.960, criterion_standalone-sdk-docs-example-contract=0.990, criterion_agent-mcp-config-snippets=1.000, criterion_provider-unknowns-remain-explicit=0.850, criterion_phase-sequence-and-terminal-ledger=0.930, criterion_latest-report-appendix-integrity=0.920, criterion_single-current-summary-source=0.970, criterion_terminal-local-scope-only=0.950, deferredScope=0.960
- Jev criterion findings: Criterion sdk-consumer-package: met (1.000 confidence) — The standalone SDK packs, installs in an isolated consumer, imports from its package root, and supports documented search-to-market-context research.; Criterion provider-field-fidelity: met (0.990 confidence) — Provider-backed identity, status, timestamps, provenance, and reported fields stay faithful; absent, unknown, or contradictory source values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.970 confidence) — MCP research preserves exact representation identity and equivalent information across text, structuredContent, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.990 confidence) — A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.960 confidence) — Execution rejects unsafe or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live broadcast is used.; Criterion standalone-sdk-docs-example-contract: met (0.990 confidence) — SDK setup, runnable example, package metadata, credential handling, and publication-status documentation match the verified local consumer path.; Criterion agent-mcp-config-snippets: met (1.000 confidence) — Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit.; Criterion provider-unknowns-remain-explicit: met (0.850 confidence) — Keep the 545-record versus 488-representation count gap, filter/pagination semantics, directory quote timestamps/liquidity, status coverage, and freshness SLA unknown; do not claim catalog completeness or unsupported fields.; Criterion phase-sequence-and-terminal-ledger: met (0.930 confidence) — A qualifying Phase 29 approval advances only to delivery-complete; a pause holds Phase 29 and its named successor with decision metadata; any other successor is rejected.; Criterion latest-report-appendix-integrity: met (0.920 confidence) — Before review, both report appendices exactly reproduce the latest prior gate decision, phase metadata, every selected-check outcome, all criterion scores, and exact deferred items.; Criterion single-current-summary-source: met (0.970 confidence) — All five current summaries show exactly one snapshot matching the latest prior gate; no stale duplicate current-state prose remains, and each new decision is synchronized automatically.; Criterion terminal-local-scope-only: met (0.950 confidence) — Phase 29 is limited to local acceptance and reporting; it does not authorize provider probes, website edits, push/publication/deployment, wallet use, broadcast, or settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T10:44:40.779Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `needs_rework` / `repair` / risk `medium`
- Jev: `needs_rework` / `repair` / risk `low` / confidence `0.350`
- Agreement: `true`
- Latency: `1093 ms`
- Phase transition: `pause`
- Transition reason: Jev did not verify criterion phase-sequence-and-terminal-ledger: gap — A qualifying Phase 29 approval advances only to delivery-complete; a pause holds Phase 29 and its named successor with decision metadata; any other successor is rejected.. Diagnose or repair this criterion before advancing.
- Selected checks:
  - `typecheck`: passed (npm run typecheck exited 0)
  - `build`: passed (npm run build exited 0)
  - `test:agent-model`: passed (npm run test:agent-model exited 0)
  - `test:asset-intent-query`: passed (npm run test:asset-intent-query exited 0)
  - `test:domain`: passed (npm run test:domain exited 0)
  - `test:plan-registry`: passed (npm run test:plan-registry exited 0)
  - `test:execution-dry-run`: passed (npm run test:execution-dry-run exited 0)
  - `test:guarded-sdk-executor`: passed (npm run test:guarded-sdk-executor exited 0)
  - `test:presentation`: passed (npm run test:presentation exited 0)
  - `test:mcp-enrichment`: passed (npm run test:mcp-enrichment exited 0)
  - `test:mcp-app-ui`: passed (npm run test:mcp-app-ui exited 0)
  - `test:mcp-live-catalog-warning`: passed (npm run test:mcp-live-catalog-warning exited 0)
  - `test:demo-mode`: passed (npm run test:demo-mode exited 0)
  - `test:phase27-contract`: passed (npm run test:phase27-contract exited 0)
  - `test:phase28-fidelity`: passed (npm run test:phase28-fidelity exited 0)
  - `test:phase26-limitations`: passed (npm run test:phase26-limitations exited 0)
  - `test:onboarding`: passed (npm run test:onboarding exited 0)
  - `test:mcp-config`: passed (npm run test:mcp-config exited 0)
  - `test:sdk-example`: passed (npm run test:sdk-example exited 0)
  - `test:distribution`: passed (npm run test:distribution exited 0)
  - `pack:check`: passed (npm run pack:check exited 0)
  - `test:cleanroom`: passed (npm run test:cleanroom exited 0)
  - `test:phase29-acceptance-evidence`: passed (npm run test:phase29-acceptance-evidence exited 0)
  - `test:core-product-phase-plan`: failed (npm run test:core-product-phase-plan exited 1)
  - `test:jev-shadow`: passed (npm run test:jev-shadow exited 0)
- Deferred assessment: `non_blocking`
- Deferred items:
  - Provider inventory count, pagination/filter semantics, freshness SLA and the observed 545-versus-488 difference remain unresolved; no new provider probe is included.
  - Third-party Agent tool selection and pixel-level rendering across every host remain unverified.
  - Website visual refinement and completion are outside this phase.
  - npm/MCP Registry publication, hosted deployment, public push or release are outside this phase; only local packing and clean-room installation are checked.
  - Real-wallet signing, funded broadcast and on-chain settlement are outside this phase; all execution evidence is synthetic and records zero live broadcasts.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (test:cleanroom, test:sdk-example, test:distribution): The standalone SDK packs, installs in an isolated consumer, imports from its package root, and supports documented search-to-market-context research. Evidence: The clean-room test packs and installs the tarball, imports the SDK from its package root, and performs search followed by marketContext against synthetic data; SDK example and distribution tests cross-check the documented consumer path.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract): Provider-backed identity, status, timestamps, provenance, and reported fields stay faithful; absent, unknown, or contradictory source values are not fabricated. Evidence: Contract and fidelity fixtures compare normalized representation identity and source fields against captured provider contracts, preserve source provenance and missing values, and reject fabricated or contradictory values.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP research preserves exact representation identity and equivalent information across text, structuredContent, and the bundled read-only native research view. Evidence: Production-shaped fixtures compare structured and rendered values, issuer representations, caveats, provenance, escaping, and read-only controls across the MCP and bundled app surfaces.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query. Evidence: A production MCP subprocess on a loopback fixture receives full Chinese and English questions, captures exact queries, resolves only unambiguous NVDA, and asserts research-only behavior with no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution rejects unsafe or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live broadcast is used. Evidence: Synthetic dry-run and guarded-executor tests reject unsafe cases; they assert zero broadcast requests and no real wallet, while plan-registry covers lifecycle, replay, and invalid transitions.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): SDK setup, runnable example, package metadata, credential handling, and publication-status documentation match the verified local consumer path. Evidence: SDK example, onboarding, and distribution regressions verify documented local commands and API shape, consistent package metadata, no checked-in credentials, and explicit non-publication status.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit. Evidence: Configuration and onboarding tests parse both examples, compare launch arguments with package scripts, reject embedded secrets, and preserve the caveat that each host controls tool selection.
  - provider-unknowns-remain-explicit (test:phase27-contract, test:phase26-limitations, test:phase28-fidelity): Keep the 545-record versus 488-representation count gap, filter/pagination semantics, directory quote timestamps/liquidity, status coverage, and freshness SLA unknown; do not claim catalog completeness or unsupported fields. Evidence: The source-contract, limitation, and fidelity regressions retain the unexplained 57-count difference and unknown filter/pagination behavior, and prevent claims of missing directory-level timestamps, liquidity, complete status coverage, freshness SLA, or catalog completeness.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): A qualifying Phase 29 approval advances only to delivery-complete; a pause holds Phase 29 and its named successor with decision metadata; any other successor is rejected. Evidence: Phase-state tests approve, hold, and reject exact transitions and successors; plan regressions verify Phase 29 scope and the ordered roadmap.
  - latest-report-appendix-integrity (test:phase29-acceptance-evidence): Before review, both report appendices exactly reproduce the latest prior gate decision, phase metadata, every selected-check outcome, all criterion scores, and exact deferred items. Evidence: The evidence regression compares the canonical JSONL decision with phase-state and each technical/product appendix, including timestamp, transition, all selected checks and outcomes, criterion confidence values, deferred assessment, and exact deferred-item text.
  - single-current-summary-source (test:phase29-acceptance-evidence, test:core-product-phase-plan): All five current summaries show exactly one snapshot matching the latest prior gate; no stale duplicate current-state prose remains, and each new decision is synchronized automatically. Evidence: The evidence regression compares the complete generated block in five files with the canonical record, rejects duplicate blocks and stale current prose, exercises idempotent insertion/replacement, and verifies the gate runner synchronizes each response.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 is limited to local acceptance and reporting; it does not authorize provider probes, website edits, push/publication/deployment, wallet use, broadcast, or settlement. Evidence: Scope regressions keep external and high-risk actions unauthorized, while distribution tests verify local packaging and consumer installation without publishing.
- Jev confidence by review item: status=0.910, nextAction=0.940, riskLevel=0.450, criterion_sdk-consumer-package=1.000, criterion_provider-field-fidelity=0.990, criterion_mcp-output-native-ui-parity=0.970, criterion_natural-language-catalog-resolution=0.990, criterion_fail-closed-execution-safety=0.970, criterion_standalone-sdk-docs-example-contract=0.980, criterion_agent-mcp-config-snippets=0.990, criterion_provider-unknowns-remain-explicit=0.810, criterion_phase-sequence-and-terminal-ledger=0.650, criterion_latest-report-appendix-integrity=0.850, criterion_single-current-summary-source=0.500, criterion_terminal-local-scope-only=0.350, deferredScope=0.910
- Jev criterion findings: Criterion sdk-consumer-package: met (1.000 confidence) — The standalone SDK packs, installs in an isolated consumer, imports from its package root, and supports documented search-to-market-context research.; Criterion provider-field-fidelity: met (0.990 confidence) — Provider-backed identity, status, timestamps, provenance, and reported fields stay faithful; absent, unknown, or contradictory source values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.970 confidence) — MCP research preserves exact representation identity and equivalent information across text, structuredContent, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.990 confidence) — A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.970 confidence) — Execution rejects unsafe or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live broadcast is used.; Criterion standalone-sdk-docs-example-contract: met (0.980 confidence) — SDK setup, runnable example, package metadata, credential handling, and publication-status documentation match the verified local consumer path.; Criterion agent-mcp-config-snippets: met (0.990 confidence) — Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit.; Criterion provider-unknowns-remain-explicit: met (0.810 confidence) — Keep the 545-record versus 488-representation count gap, filter/pagination semantics, directory quote timestamps/liquidity, status coverage, and freshness SLA unknown; do not claim catalog completeness or unsupported fields.; Criterion phase-sequence-and-terminal-ledger: gap (0.650 confidence) — A qualifying Phase 29 approval advances only to delivery-complete; a pause holds Phase 29 and its named successor with decision metadata; any other successor is rejected.; Criterion latest-report-appendix-integrity: met (0.850 confidence) — Before review, both report appendices exactly reproduce the latest prior gate decision, phase metadata, every selected-check outcome, all criterion scores, and exact deferred items.; Criterion single-current-summary-source: gap (0.500 confidence) — All five current summaries show exactly one snapshot matching the latest prior gate; no stale duplicate current-state prose remains, and each new decision is synchronized automatically.; Criterion terminal-local-scope-only: met (0.350 confidence) — Phase 29 is limited to local acceptance and reporting; it does not authorize provider probes, website edits, push/publication/deployment, wallet use, broadcast, or settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.

### Jev phase-gate record — 2026-10-03T10:50:42.287Z
- Phase: `sdk-mcp-final-acceptance`
- Jev provider: `native-jev`
- Baseline: `passed_with_deferred_items` / `continue` / risk `low`
- Jev: `passed_with_deferred_items` / `continue` / risk `low` / confidence `0.880`
- Agreement: `true`
- Latency: `1112 ms`
- Phase transition: `advance`
- Transition reason: Baseline and Jev agree on a low-risk continuation.
- Selected checks:
  - `typecheck`: passed (npm run typecheck exited 0)
  - `build`: passed (npm run build exited 0)
  - `test:agent-model`: passed (npm run test:agent-model exited 0)
  - `test:asset-intent-query`: passed (npm run test:asset-intent-query exited 0)
  - `test:domain`: passed (npm run test:domain exited 0)
  - `test:plan-registry`: passed (npm run test:plan-registry exited 0)
  - `test:execution-dry-run`: passed (npm run test:execution-dry-run exited 0)
  - `test:guarded-sdk-executor`: passed (npm run test:guarded-sdk-executor exited 0)
  - `test:presentation`: passed (npm run test:presentation exited 0)
  - `test:mcp-enrichment`: passed (npm run test:mcp-enrichment exited 0)
  - `test:mcp-app-ui`: passed (npm run test:mcp-app-ui exited 0)
  - `test:mcp-live-catalog-warning`: passed (npm run test:mcp-live-catalog-warning exited 0)
  - `test:demo-mode`: passed (npm run test:demo-mode exited 0)
  - `test:phase27-contract`: passed (npm run test:phase27-contract exited 0)
  - `test:phase28-fidelity`: passed (npm run test:phase28-fidelity exited 0)
  - `test:phase26-limitations`: passed (npm run test:phase26-limitations exited 0)
  - `test:onboarding`: passed (npm run test:onboarding exited 0)
  - `test:mcp-config`: passed (npm run test:mcp-config exited 0)
  - `test:sdk-example`: passed (npm run test:sdk-example exited 0)
  - `test:distribution`: passed (npm run test:distribution exited 0)
  - `pack:check`: passed (npm run pack:check exited 0)
  - `test:cleanroom`: passed (npm run test:cleanroom exited 0)
  - `test:phase29-acceptance-evidence`: passed (npm run test:phase29-acceptance-evidence exited 0)
  - `test:core-product-phase-plan`: passed (npm run test:core-product-phase-plan exited 0)
  - `test:jev-shadow`: passed (npm run test:jev-shadow exited 0)
- Deferred assessment: `non_blocking`
- Deferred items:
  - Provider inventory count, pagination/filter semantics, freshness SLA and the observed 545-versus-488 difference remain unresolved; no new provider probe is included.
  - Third-party Agent tool selection and pixel-level rendering across every host remain unverified.
  - Website visual refinement and completion are outside this phase.
  - npm/MCP Registry publication, hosted deployment, public push or release are outside this phase; only local packing and clean-room installation are checked.
  - Real-wallet signing, funded broadcast and on-chain settlement are outside this phase; all execution evidence is synthetic and records zero live broadcasts.
- Acceptance criteria and supplied evidence:
  - sdk-consumer-package (test:cleanroom, test:sdk-example, test:distribution): The standalone SDK packs, installs in an isolated consumer, imports from its package root, and supports documented search-to-market-context research. Evidence: The clean-room test packs and installs the tarball, imports the SDK from its package root, and performs search followed by marketContext against synthetic data; SDK example and distribution tests cross-check the documented consumer path.
  - provider-field-fidelity (test:phase28-fidelity, test:phase27-contract): Provider-backed identity, status, timestamps, provenance, and reported fields stay faithful; absent, unknown, or contradictory source values are not fabricated. Evidence: Contract and fidelity fixtures compare normalized representation identity and source fields against captured provider contracts, preserve source provenance and missing values, and reject fabricated or contradictory values.
  - mcp-output-native-ui-parity (test:mcp-enrichment, test:mcp-app-ui, test:presentation): MCP research preserves exact representation identity and equivalent information across text, structuredContent, and the bundled read-only native research view. Evidence: Production-shaped fixtures compare structured and rendered values, issuer representations, caveats, provenance, escaping, and read-only controls across the MCP and bundled app surfaces.
  - natural-language-catalog-resolution (test:mcp-live-catalog-warning): A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query. Evidence: A production MCP subprocess on a loopback fixture receives full Chinese and English questions, captures exact queries, resolves only unambiguous NVDA, and asserts research-only behavior with no side effects.
  - fail-closed-execution-safety (test:execution-dry-run, test:guarded-sdk-executor, test:plan-registry): Execution rejects unsafe or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live broadcast is used. Evidence: Synthetic dry-run and guarded-executor tests reject unsafe cases; they assert zero broadcast requests and no real wallet, while plan-registry covers lifecycle, replay, and invalid transitions.
  - standalone-sdk-docs-example-contract (test:sdk-example, test:distribution, test:onboarding): SDK setup, runnable example, package metadata, credential handling, and publication-status documentation match the verified local consumer path. Evidence: SDK example, onboarding, and distribution regressions verify documented local commands and API shape, consistent package metadata, no checked-in credentials, and explicit non-publication status.
  - agent-mcp-config-snippets (test:mcp-config, test:onboarding): Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit. Evidence: Configuration and onboarding tests parse both examples, compare launch arguments with package scripts, reject embedded secrets, and preserve the caveat that each host controls tool selection.
  - provider-unknowns-remain-explicit (test:phase27-contract, test:phase26-limitations, test:phase28-fidelity): Keep the 545-record versus 488-representation count gap, filter/pagination semantics, directory quote timestamps/liquidity, status coverage, and freshness SLA unknown; do not claim catalog completeness or unsupported fields. Evidence: The source-contract, limitation, and fidelity regressions retain the unexplained 57-count difference and unknown filter/pagination behavior, and prevent claims of missing directory-level timestamps, liquidity, complete status coverage, freshness SLA, or catalog completeness.
  - phase-sequence-and-terminal-ledger (test:core-product-phase-plan, test:jev-shadow): A qualifying Phase 29 approval advances only to delivery-complete; a pause holds Phase 29 and its named successor with decision metadata; any other successor is rejected. Evidence: Phase-state tests approve, hold, and reject exact transitions and successors; plan regressions verify Phase 29 scope and the ordered roadmap.
  - latest-report-appendix-integrity (test:phase29-acceptance-evidence): Before review, both report appendices exactly reproduce the latest prior gate decision, phase metadata, every selected-check outcome, all criterion scores, and exact deferred items. Evidence: The evidence regression compares the canonical JSONL decision with phase-state and each technical/product appendix, including timestamp, transition, all selected checks and outcomes, criterion confidence values, deferred assessment, and exact deferred-item text.
  - single-current-summary-source (test:phase29-acceptance-evidence, test:core-product-phase-plan): All five current summaries show exactly one snapshot matching the latest prior gate; no stale duplicate current-state prose remains, and each new decision is synchronized automatically. Evidence: The evidence regression compares the complete generated block in five files with the canonical record, rejects duplicate blocks and stale current prose, exercises idempotent insertion/replacement, and verifies the gate runner synchronizes each response.
  - terminal-local-scope-only (test:core-product-phase-plan, test:jev-shadow, test:distribution): Phase 29 is limited to local acceptance and reporting; it does not authorize provider probes, website edits, push/publication/deployment, wallet use, broadcast, or settlement. Evidence: Scope regressions keep external and high-risk actions unauthorized, while distribution tests verify local packaging and consumer installation without publishing.
- Jev confidence by review item: status=0.980, nextAction=0.990, riskLevel=1.000, criterion_sdk-consumer-package=1.000, criterion_provider-field-fidelity=0.990, criterion_mcp-output-native-ui-parity=0.970, criterion_natural-language-catalog-resolution=0.990, criterion_fail-closed-execution-safety=0.960, criterion_standalone-sdk-docs-example-contract=0.990, criterion_agent-mcp-config-snippets=1.000, criterion_provider-unknowns-remain-explicit=0.880, criterion_phase-sequence-and-terminal-ledger=0.930, criterion_latest-report-appendix-integrity=0.930, criterion_single-current-summary-source=0.970, criterion_terminal-local-scope-only=0.900, deferredScope=0.950
- Jev criterion findings: Criterion sdk-consumer-package: met (1.000 confidence) — The standalone SDK packs, installs in an isolated consumer, imports from its package root, and supports documented search-to-market-context research.; Criterion provider-field-fidelity: met (0.990 confidence) — Provider-backed identity, status, timestamps, provenance, and reported fields stay faithful; absent, unknown, or contradictory source values are not fabricated.; Criterion mcp-output-native-ui-parity: met (0.970 confidence) — MCP research preserves exact representation identity and equivalent information across text, structuredContent, and the bundled read-only native research view.; Criterion natural-language-catalog-resolution: met (0.990 confidence) — A full Chinese or English research question with no direct provider match falls back only to an unambiguous catalog ticker and returns read-only research without losing the original query.; Criterion fail-closed-execution-safety: met (0.960 confidence) — Execution rejects unsafe or changed preflight, invalid/expired plans, insufficient funds, signer/signature/gas faults, and replay; no real wallet or live broadcast is used.; Criterion standalone-sdk-docs-example-contract: met (0.990 confidence) — SDK setup, runnable example, package metadata, credential handling, and publication-status documentation match the verified local consumer path.; Criterion agent-mcp-config-snippets: met (1.000 confidence) — Demo and Live MCP config examples parse and match the documented stdio server command; secrets stay local and host-dependent tool selection is explicit.; Criterion provider-unknowns-remain-explicit: met (0.880 confidence) — Keep the 545-record versus 488-representation count gap, filter/pagination semantics, directory quote timestamps/liquidity, status coverage, and freshness SLA unknown; do not claim catalog completeness or unsupported fields.; Criterion phase-sequence-and-terminal-ledger: met (0.930 confidence) — A qualifying Phase 29 approval advances only to delivery-complete; a pause holds Phase 29 and its named successor with decision metadata; any other successor is rejected.; Criterion latest-report-appendix-integrity: met (0.930 confidence) — Before review, both report appendices exactly reproduce the latest prior gate decision, phase metadata, every selected-check outcome, all criterion scores, and exact deferred items.; Criterion single-current-summary-source: met (0.970 confidence) — All five current summaries show exactly one snapshot matching the latest prior gate; no stale duplicate current-state prose remains, and each new decision is synchronized automatically.; Criterion terminal-local-scope-only: met (0.900 confidence) — Phase 29 is limited to local acceptance and reporting; it does not authorize provider probes, website edits, push/publication/deployment, wallet use, broadcast, or settlement.
- Action taken: `none`
- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.
