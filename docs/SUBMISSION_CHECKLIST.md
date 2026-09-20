# Ariadne 提交前检查清单

## 评委运行路径

1. 在项目根目录安装依赖：`npm install`。
2. 复制 `.env.example` 为 `.env`，填入参赛者自己的 Binance Web3 API credentials；不要把 credentials 放进 MCP JSON。
3. 保持 `BINANCE_WEB3_PROXY_URL` 为空，或填写评委自己的网络代理。
4. 将 `docs/mcp-config.example.json` 中的 `cwd` 替换为项目绝对路径。
5. 在 Codex 中连接 `ariadne-tokenized-stocks` MCP server。
6. 发送 Demo prompt：

   > Search for NVIDIA tokenized stocks on BSC. Compare the available platform versions. Use the bStocks version to create a plan to buy 10 USDT worth. Show the market status, reference price, quote and safety warnings. Do not execute any transaction.

## 预期展示

- Agent 调用 `resolve_tokenized_stock` 找到 Ondo 与 bStocks；
- Agent 保留 chain、platform 和 contract identity；
- Agent 获取市场价格、参考价、状态和 warnings；
- Agent 获取报价并创建 ActionPlan；
- 无资金钱包会在 allowance/余额安全检查处明确阻断；
- 全程 `broadcasted: false`，不签名、不广播。

## 验收命令

```bash
npm run typecheck
npm run test:domain
npm run test:retry-policy
npm run test:mcp-config
npm run test:mcp
npm run audit:phases
```

## 必须诚实披露的限制

- DeFi Positions 当前可能返回官方服务端 `50000`；不能解释为空持仓；
- RFQ 真实提交需要外部钱包对 `typedDataToSign` 做 EIP-712 签名；
- Ariadne 不持有私钥，也不会自动签名；
- 真实广播需要用户明确确认和外部签名交易；
- 无资金 Preview 是安全演示，不等同于成功链上交易。

## 提交前人工确认

- [ ] README 和 Demo prompt 已更新；
- [ ] MCP 配置不包含 API Secret；
- [ ] `.env` 不被提交；
- [ ] 运行截图展示工具调用和安全边界；
- [ ] Demo 视频不展示真实私钥或 API credentials；
- [ ] 最终提交表单中的描述与当前实际能力一致。
