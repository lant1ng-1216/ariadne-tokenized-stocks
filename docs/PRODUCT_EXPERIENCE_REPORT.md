# Ariadne Product Experience Issues and Improvement Record

Updated: 2026-09-21

## Purpose

## First-use experience update

The primary first-use path is now natural language rather than memorizing MCP tool names. A new user can launch Demo Mode without credentials or funds and ask for a tokenized-stock research brief. The Agent can select `research_tokenized_stock`, which returns issuer representations, market context, warnings, comparison evidence and a safe next action in one response. Live Mode uses the same interaction pattern after the user supplies their own API credentials.

The interface remains explicit at the execution boundary: research is read-only, recommendations are not investment advice, and quotes, signatures, transactions and broadcasts are separate later steps.

The presentation layer now uses a research-brief hierarchy: an at-a-glance count and warning summary, a cross-issuer comparison table, issuer-specific evidence cards, and a final execution-boundary statement. This is intended to make the interaction feel like an Agent-native research surface rather than a serialized API response.

This document records the observed onboarding and Agent-interaction issues for Ariadne. It is intended to support future development, the Developer Experience Report and the Technical Research Report. It distinguishes observed facts from hypotheses and planned work.

## 1. Product positioning

Ariadne is an SDK and MCP infrastructure layer for existing Agents. It is not a separate autonomous Agent. It provides tokenized-stock identity resolution, market context, action planning, safety checks, simulation and explicit external-signing boundaries for clients such as Codex and Claude Code.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.

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
- Safety note: Jev does not control Codex and no external write was authorized.
