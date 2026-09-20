# Ariadne Demo Script

## Setup

```bash
npm install
npm run typecheck
```

## MCP client setup

Copy `docs/mcp-config.example.json` into the MCP client configuration and replace its `cwd` with the absolute project path. Do not put API credentials in the JSON file; the server reads them from the project-root `.env`.

## Demo prompt（无资金 Preview）

In a connected MCP client such as Codex or Claude Code:

> Search for NVIDIA tokenized stocks on BSC. Compare the available platform versions. Use the bStocks version to create a plan to buy 10 USDT worth. Show the market status, reference price, quote and safety warnings. Do not execute any transaction.

该 Preview 不要求钱包有资金，也不要求提供私钥。使用零地址或无资金地址时，预期结果是 allowance/余额安全检查阻断计划；这不是空结果，也不是模拟成功。Agent 应明确展示阻断原因，并保持 `broadcasted: false`。

## Expected flow

1. `resolve_tokenized_stock` finds Ondo and bStocks versions;
2. the Agent keeps chain and contract identity visible;
3. `create_stock_action_plan` fetches market context, a platform-aware quote and evaluates the allowance boundary;
4. the result includes a plan ID, expected output, quote ID, gas data, expiry and confirmation requirement;
5. with the zero-address demo wallet, the allowance check is expected to stop the plan before executable simulation; this demonstrates that Ariadne does not pretend an unfunded wallet can trade;
6. no transaction is signed or broadcast.

The separate `confirm_stock_action_plan` tool is available for the explicit confirmation boundary; it only changes the plan state and still does not sign or broadcast.

## Automated reproduction

```bash
npm run test:mcp
npm run demo
```

Expected output includes:

```text
resolveSucceeded: true
planSucceeded: true
```

`npm run demo` prints the selected asset, platform comparison, action plan and safety result. It also prints `broadcasted: false`; the demo never signs or broadcasts a transaction. A real successful transaction simulation requires a user-provided funded wallet and is intentionally not fabricated by the demo.
