# Ariadne Quickstart

## Demo Mode — no API credentials

Demo Mode provides deterministic, read-only NVDA exploration so a user can test the Agent-native interaction without Binance credentials or wallet funds.

```bash
npm install
npm run mcp:demo
```

Configure the MCP client to launch `npm run mcp:demo` with the repository as its working directory, then ask:

```text
I want to understand the tokenized NVIDIA stock versions on BNB Chain. Compare them and show the warnings. Do not create a transaction.
```

Demo Mode never creates an executable action plan, signs, broadcasts or represents deterministic data as live market data.

## Live Mode

For live read-only data and quote preparation:

```bash
cp .env.example .env
npm install
```

Set the user's own Binance Web3 API credentials in `.env`, then configure the MCP client using `docs/mcp-config.example.json`. Real signing and broadcasting remain separate user-wallet operations.
