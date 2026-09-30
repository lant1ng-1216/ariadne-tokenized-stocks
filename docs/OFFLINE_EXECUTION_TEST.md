# 无资金交易流程演练

这是一套**纯本地合成测试**。不需要连接钱包、不需要 BNB 或 USDT、不需要 API 密钥，也不会向区块链广播。素材里的 `TESTB`、报价、地址和 `0x1234` 调用数据都不是可执行的真实交易。

## 你要做什么

在终端运行：

```bash
cd "/Users/Zhuanz/Desktop/BNB Hack-Tokenized Stocks Edition"
npm run test:execution-dry-run
```

如果你不想使用终端，也可以直接告诉 Codex：“运行 `npm run test:execution-dry-run`，把结果给我看。”

看到 `"passed": true`、`"broadcastRequests": 0`、`"realWalletUsed": false`，就代表这次**离线演练**通过；这不代表真实交易成功。如果命令报错，把完整报错发给 Codex，不要自行导入私钥或向测试地址转账。

## 提供的测试素材

- [`scripts/fixtures/execution-dry-run.json`](../scripts/fixtures/execution-dry-run.json)：合成股票、报价参数、余额、Gas 上限和目标地址。
- [`scripts/test-execution-dry-run.ts`](../scripts/test-execution-dry-run.ts)：自动走完报价、准备计划、模拟、确认、固定测试密钥离线签名及广播前安全检查，并测试拒绝路径。

脚本中的固定测试密钥是公开的，**绝不能存入资金或用作真实钱包**。脚本只在本机内存里构造测试交易；模拟 API 拒绝任何广播请求。

## 本次会检查什么

正常路径：报价与余额/授权检查 → 计划登记 → 模拟 → 确认 → 测试交易签名 → 签名、Gas 预算和余额核对 → **在广播前停止**。

拒绝路径：输入代币余额不足、计划被改动、计划过期、模拟失败、签名钱包错误、Gas 超预算、BNB 不足、确认后输入余额变化、重复提交。

真正的链上验证需要单独的测试钱包、明确的金额上限和你的再次授权；本演练不做这件事。
