import assert from "node:assert/strict";
import { getGlobalDispatcher, MockAgent, setGlobalDispatcher } from "undici";
import { TransactionService } from "../src/services/transaction.js";

const token = "0x1111111111111111111111111111111111111111";
const owner = "0x2222222222222222222222222222222222222222";
const rpcUrl = "http://balance.test/";
const originalDispatcher = getGlobalDispatcher();
const originalProxyUrl = process.env.BINANCE_WEB3_PROXY_URL;
// This suite exercises undici's local MockAgent; never route its fake host
// through a developer machine's configured outbound proxy.
delete process.env.BINANCE_WEB3_PROXY_URL;
const mock = new MockAgent();
mock.disableNetConnect();
setGlobalDispatcher(mock);
try {
  const pool = mock.get("http://balance.test");
  let requestBody: any;
  pool.intercept({ path: "/", method: "POST" }).reply((request) => {
    requestBody = JSON.parse(String(request.body));
    return { statusCode: 200, data: { jsonrpc: "2.0", id: 1, result: `0x${(1_250_000n).toString(16).padStart(64, "0")}` } };
  });
  const transactions = new TransactionService({} as any);
  assert.equal(await transactions.erc20Balance("56", token, owner, rpcUrl), 1_250_000n);
  assert.equal(requestBody.method, "eth_call");
  assert.equal(requestBody.params[0].to, token);
  assert.equal(requestBody.params[0].data, `0x70a08231${owner.slice(2).padStart(64, "0")}`);
  assert.equal(requestBody.params[1], "latest");
  pool.intercept({ path: "/", method: "POST" }).reply((request) => {
    requestBody = JSON.parse(String(request.body));
    return { statusCode: 200, data: { jsonrpc: "2.0", id: 1, result: "0x1" } };
  });
  assert.equal(await transactions.nativeBalance("56", owner, rpcUrl), 1n);
  assert.equal(requestBody.method, "eth_getBalance");
  assert.deepEqual(requestBody.params, [owner, "latest"]);
  pool.intercept({ path: "/", method: "POST" }).reply(200, { jsonrpc: "2.0", id: 1, result: "0x" });
  await assert.rejects(transactions.erc20Balance("56", token, owner, rpcUrl), /invalid ERC-20 balance result/);
  pool.intercept({ path: "/", method: "POST" }).reply(200, { jsonrpc: "2.0", id: 1, result: "0xffff" });
  await assert.rejects(transactions.erc20Allowance("56", token, owner, "0x3333333333333333333333333333333333333333", rpcUrl), /invalid allowance result/);
  pool.intercept({ path: "/", method: "POST" }).reply(200, { jsonrpc: "2.0", id: 1, result: `0x${"0".repeat(63)}1` });
  assert.equal(await transactions.erc20Allowance("56", token, owner, "0x3333333333333333333333333333333333333333", rpcUrl), 1n);
  pool.intercept({ path: "/", method: "POST" }).reply(200, { jsonrpc: "2.0", id: 1, error: { message: "RPC down" } });
  await assert.rejects(transactions.erc20Balance("56", token, owner, rpcUrl), /RPC down/);
  pool.intercept({ path: "/", method: "POST" }).reply(200, { jsonrpc: "2.0", id: 1, result: "0x" });
  await assert.rejects(transactions.nativeBalance("56", owner, rpcUrl), /invalid native balance result/);
  await assert.rejects(transactions.erc20Balance("1", token, owner, rpcUrl), /No default EVM RPC/);
  await assert.rejects(transactions.erc20Balance("56", "0x1234", owner, rpcUrl), /valid token and wallet addresses/);
  mock.assertNoPendingInterceptors();
  console.log(JSON.stringify({ readOnlyBalanceCall: true, malformedAndRpcErrorsRejected: true, broadcasted: false, passed: true }, null, 2));
} finally {
  if (originalProxyUrl !== undefined) process.env.BINANCE_WEB3_PROXY_URL = originalProxyUrl;
  setGlobalDispatcher(originalDispatcher);
  await mock.close();
}
