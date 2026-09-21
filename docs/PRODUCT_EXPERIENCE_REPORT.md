# Ariadne Product Experience Issues and Improvement Record

Updated: 2026-09-21

## Purpose

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
