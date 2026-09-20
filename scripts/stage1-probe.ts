import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";

const key = process.env.BINANCE_WEB3_API_KEY;
const secret = process.env.BINANCE_WEB3_API_SECRET;
if (!key || !secret) throw new Error("Missing Binance Web3 credentials in .env");
const signingSecret = secret;

function call(method: "GET" | "POST", path: string, body = "") {
  const timestamp = new Date().toISOString();
  const sign = createHmac("sha256", signingSecret).update(`${timestamp}${method}${path}${body}`).digest("base64");
  const proxy = process.env.BINANCE_WEB3_PROXY_URL;
  const args = ["--silent", "--show-error", "--max-time", "20", ...(proxy ? ["--proxy", proxy] : []),
    "--header", `X-OC-APIKEY: ${key}`, "--header", `X-OC-TIMESTAMP: ${timestamp}`,
    "--header", `X-OC-SIGN: ${sign}`];
  if (body) args.push("--header", "Content-Type: application/json", "--data-raw", body);
  args.push(`https://web3.binance.com${path}`);
  const result = spawnSync("curl", args, { encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(String(result.stderr || result.error));
  return JSON.parse(String(result.stdout));
}

function summary(name: string, payload: any) {
  console.log(JSON.stringify({ name, code: payload.code, success: payload.success, message: payload.msg,
    dataShape: Array.isArray(payload.data) ? `array(${payload.data.length})` : typeof payload.data,
    sampleKeys: payload.data && !Array.isArray(payload.data) ? Object.keys(payload.data).slice(0, 20) : undefined
  }));
}

const contract = "0xa9ee28c80f960b889dfbd1902055218cba016f75";
const zero = "0x0000000000000000000000000000000000000000";

summary("rwa-underlying-profile", call("GET", `/build/api/v1/dex/market/rwa/underlying-profile?binanceChainId=56&tokenContractAddress=${contract}`));
summary("portfolio-overview", call("GET", `/build/api/v1/dex/market/portfolio/overview?binanceChainId=56&walletAddress=${zero}&timeFrame=1`));
summary("defi-protocol-list", call("POST", "/build/api/v1/defi/data/protocol/list", JSON.stringify({ binanceChainId: "56" })));
summary("defi-investment-list", call("POST", "/build/api/v1/defi/data/investment/list", JSON.stringify({ binanceChainId: "56", investType: "Earn", page: 1, size: 20 })));
summary("defi-positions", call("POST", "/build/api/v1/defi/data/position/list", JSON.stringify({ addresses: [zero], binanceChainIds: ["56"] })));
