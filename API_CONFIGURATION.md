# API Configuration

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Set the Binance Web3 API credentials issued from the official developer portal:

```dotenv
BINANCE_WEB3_API_KEY=your_api_key
BINANCE_WEB3_API_SECRET=your_api_secret
BINANCE_WEB3_BASE_URL=https://web3.binance.com/build
BINANCE_WEB3_PROXY_URL=
BINANCE_WEB3_EVM_RPC_URL=https://bsc-dataseed.binance.org
```

The `.env` file is local-only and is excluded by `.gitignore`. Never commit API secrets, wallet private keys, or seed phrases. Ariadne does not hold or generate user wallet signatures.
