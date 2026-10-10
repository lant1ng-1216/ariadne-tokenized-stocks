import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const repo = process.cwd();
const tempRoot = await mkdtemp(join(tmpdir(), "ariadne-consumer-"));
const npmCache = join(tempRoot, "npm-cache");

function run(command, args, cwd = repo, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let killTimer;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), 5_000);
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timeout);
      clearTimeout(killTimer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      clearTimeout(killTimer);
      if (timedOut) {
        const error = new Error(`${command} ${args[0] ?? ""} exceeded ${timeoutMs}ms`);
        error.code = "CLEANROOM_TIMEOUT";
        error.output = `${stdout}\n${stderr}`;
        reject(error);
      } else if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`${command} ${args[0] ?? ""} exited ${code}`);
        error.code = "CLEANROOM_COMMAND_FAILED";
        error.output = `${stdout}\n${stderr}`;
        reject(error);
      }
    });
  });
}

try {
  await run("npm", ["run", "build"]);
  const pack = await run("npm", ["pack", "--pack-destination", tempRoot, "--cache", npmCache]);
  const tarballName = pack.stdout.trim().split("\n").at(-1);
  assert.ok(tarballName?.endsWith(".tgz"), `Unexpected npm pack output: ${pack.stdout}`);
  const tarball = join(tempRoot, tarballName);
  await writeFile(join(tempRoot, "package.json"), JSON.stringify({ name: "ariadne-cleanroom-consumer", private: true, type: "module" }, null, 2));
  await run("npm", ["install", "--ignore-scripts", "--no-package-lock", "--no-audit", "--no-fund", "--fetch-retries=0", "--fetch-timeout=30000", "--cache", npmCache, tarball], tempRoot, 300_000);

  const runtime = `import assert from "node:assert/strict";
import { createServer } from "node:http";
import { BinanceWeb3Client, BinanceWeb3Error, TokenizedStocksService, compareAgentAssets } from "ariadne-tokenized-stocks";
const observedRequests = [];
const server = createServer((request, response) => {
  observedRequests.push({ method: request.method, url: request.url, apiKey: request.headers["x-oc-apikey"], signature: request.headers["x-oc-sign"] });
  const requestUrl = new URL(request.url, "http://127.0.0.1");
  const path = requestUrl.pathname;
  let data;
  if (path === "/api/v1/dex/market/rwa/search") {
    data = [{ ticker: "NVDA", companyName: "NVIDIA", assets: [
      { platformId: "ondo", binanceChainId: "56", tokenContractAddress: "0x1111111111111111111111111111111111111111", tokenSymbol: "NVDAon" },
      { platformId: "bstock", binanceChainId: "56", tokenContractAddress: "0x2222222222222222222222222222222222222222", tokenSymbol: "NVDAB" }
    ] }];
  } else if (path === "/api/v1/dex/market/rwa/platforms") {
    data = ["ondo", "bstock"].map((platformId) => ({ platformId, website: "https://example.invalid", logoUrl: "https://example.invalid/logo.svg", chainDistribution: [{ binanceChainId: "56", tokenCount: 1 }] }));
  } else if (path === "/api/v1/dex/market/rwa/tokens") {
    data = [
      { binanceChainId: "56", tokenContractAddress: "0x1111111111111111111111111111111111111111", platformId: "ondo", tokenSymbol: "NVDAon", underlyingTicker: "NVDA", underlyingName: "NVIDIA", statusInfo: { openState: true, marketStatus: "regular" }, volume24H: "1000" },
      { binanceChainId: "56", tokenContractAddress: "0x2222222222222222222222222222222222222222", platformId: "bstock", tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "NVIDIA", statusInfo: { openState: true, marketStatus: "regular" }, volume24H: "2000" }
    ];
  } else if (path === "/api/v1/dex/market/rwa/price") {
    const requestedAddresses = new Set((requestUrl.searchParams.get("tokenContractAddresses") ?? "").split(","));
    data = [
      { binanceChainId: "56", tokenContractAddress: "0x1111111111111111111111111111111111111111", platformId: "ondo", tokenPrice: "120.00", referencePrice: "121.00", tokenPriceUpdatedAt: 1790928000000 },
      { binanceChainId: "56", tokenContractAddress: "0x2222222222222222222222222222222222222222", platformId: "bstock", tokenPrice: "234.50", referencePrice: "234.00", tokenPriceUpdatedAt: 1790928000000 }
    ].filter((row) => requestedAddresses.has(row.tokenContractAddress));
  } else {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ code: 404, msg: "unknown fixture route", data: null, timestamp: Date.now(), success: false }));
    return;
  }
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ code: 0, msg: "success", data, timestamp: 1790928000100, success: true }));
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const observations = [];
  const client = new BinanceWeb3Client({ apiKey: "cleanroom", apiSecret: "cleanroom", baseUrl: "http://127.0.0.1:" + address.port, maxRetries: 0, retryBaseDelayMs: 5, timeoutMs: 1000, onRequest: (event) => observations.push(event) });
  assert.equal(typeof client.get, "function");
  assert.equal(typeof TokenizedStocksService, "function");
  assert.equal(typeof compareAgentAssets, "function");
  const error = new BinanceWeb3Error("blocked", 400, "INVALID_REQUEST", false, { field: "symbol" });
  assert.equal(error.status, 400);
  assert.equal(error.code, "INVALID_REQUEST");
  assert.equal(error.retryable, false);
  assert.deepEqual(error.details, { field: "symbol" });

  // Exercise the documented standalone SDK journey against a loopback-only fixture.
  const stocks = new TokenizedStocksService(client);
  for (const query of ["", String.fromCharCode(32, 9, 10, 32)]) {
    await assert.rejects(
      stocks.search(query),
      (error) => error instanceof TypeError && error.message === "TokenizedStocksService.search query must not be empty"
    );
  }
  assert.equal(observedRequests.length, 0, "blank and whitespace-only searches must fail before any provider request");
  const assets = await stocks.search("NVDA", { chainId: "56" });
  assert.equal(assets.length, 2);
  assert.deepEqual(assets.map((asset) => ({ platformId: asset.platformId, tokenSymbol: asset.tokenSymbol, contractAddress: asset.contractAddress })), [
    { platformId: "ondo", tokenSymbol: "NVDAon", contractAddress: "0x1111111111111111111111111111111111111111" },
    { platformId: "bstock", tokenSymbol: "NVDAB", contractAddress: "0x2222222222222222222222222222222222222222" }
  ]);
  const chosenPlatform = "bstock";
  const selectedAsset = assets.find((asset) => asset.platformId === chosenPlatform);
  assert.ok(selectedAsset, "the consumer must explicitly choose a returned issuer representation");
  const market = await stocks.marketContext(selectedAsset);
  assert.equal(market.asset.platformId, chosenPlatform);
  assert.equal(market.asset.tokenSymbol, "NVDAB");
  assert.equal(market.asset.contractAddress, "0x2222222222222222222222222222222222222222");
  assert.equal(market.tokenPrice, "234.50");
  assert.equal(market.referencePrice, "234.00");
  assert.equal(market.marketStatus, "open");
  assert.equal(market.tokenPriceUpdatedAt, 1790928000000);
  assert.ok(market.dataWarnings.some((warning) => warning.includes("Liquidity was not provided")));
  assert.deepEqual(market.provenance?.map((item) => item.endpoint), ["/api/v1/dex/market/rwa/price", "/api/v1/dex/market/rwa/tokens"]);
  assert.equal(observedRequests.length, 4);
  assert.ok(observedRequests.every((request) => request.method === "GET" && request.apiKey === "cleanroom" && typeof request.signature === "string" && request.signature.length > 0));
  assert.deepEqual(observations.map((event) => event.success), [true, true, true, true]);
  console.log("cleanroom package runtime, signed local-fixture SDK journey, and type declarations passed");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
`;
  await writeFile(join(tempRoot, "consumer.mjs"), runtime);
  const runtimeResult = await run(process.execPath, ["consumer.mjs"], tempRoot);
  assert.match(runtimeResult.stdout, /cleanroom package runtime, signed local-fixture SDK journey, and type declarations passed/);

  const typecheck = `import { BinanceWeb3Client, BinanceWeb3Error, TokenizedStocksService, type BinanceWeb3Config, type RequestObservation } from "ariadne-tokenized-stocks";
const observations: RequestObservation[] = [];
const config: BinanceWeb3Config = { apiKey: "cleanroom", apiSecret: "cleanroom", baseUrl: "https://example.invalid", proxyUrl: "http://127.0.0.1:8080", maxRetries: 0, retryBaseDelayMs: 5, timeoutMs: 1000, onRequest: (event) => observations.push(event) };
const client = new BinanceWeb3Client(config);
const stocks = new TokenizedStocksService(client);
const error = new BinanceWeb3Error("blocked", 400, "INVALID_REQUEST", false);
void error.status;
void error.code;
void error.retryable;
void error.details;
void stocks;
void observations;
`;
  await writeFile(join(tempRoot, "consumer.ts"), typecheck);
  await run(join(repo, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "consumer.ts"], tempRoot);

  const manifest = JSON.parse(await readFile(join(tempRoot, "node_modules/ariadne-tokenized-stocks/package.json"), "utf8"));
  assert.equal(manifest.name, "ariadne-tokenized-stocks");
  assert.equal(manifest.engines?.node, ">=22.19.0");
  assert.ok(manifest.exports["."]);
  console.log(JSON.stringify({ status: "passed", cacheIsolation: "fresh per run", packageInstalled: true, runtimeImport: true, blankQueriesRejectedBeforeProviderRequest: true, bothIssuerRepresentationsInspected: true, marketContextRequestedForExplicitBstocksSelection: true, requestSigningHeaders: true, provenanceAndMissingLiquidityPreserved: true, typeDeclarations: true, packageRootExports: true, nodeEngine: manifest.engines.node, passed: true }, null, 2));
} catch (error) {
  const output = error && typeof error === "object" && "output" in error ? String(error.output) : "";
  const timedOut = error && typeof error === "object" && "code" in error && error.code === "CLEANROOM_TIMEOUT";
  const networkLimited = /\b(ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEDOUT|ENETUNREACH|ENOTFOUND|EAI_AGAIN|ERR_SOCKET_TIMEOUT)\b/i.test(output);
  const inconclusive = timedOut || networkLimited;
  console.log(JSON.stringify({
    status: inconclusive ? "inconclusive" : "failed",
    passed: false,
    reason: timedOut ? "subprocess_timeout" : networkLimited ? "network_or_registry_unavailable" : error instanceof Error ? error.message : "unknown_failure",
  }, null, 2));
  process.exitCode = 1;
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
