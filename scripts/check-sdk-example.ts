import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("examples/sdk-usage.ts", "utf8");
assert.match(source, /TokenizedStocksService/);
assert.match(source, /BinanceWeb3Client/);
assert.match(source, /BINANCE_WEB3_PROXY_URL/);
assert.match(source, /stocks\.search/);
assert.match(source, /Returned issuer representations/);
assert.match(source, /selectedAssetId = process\.argv\[2\]/);
assert.match(source, /asset\.assetId === selectedAssetId/);
assert.match(source, /stocks\.marketContext/);
assert.doesNotMatch(source, /assets\[0\]/, "the example must never silently select the first returned issuer");
console.log("SDK usage example source check passed");
