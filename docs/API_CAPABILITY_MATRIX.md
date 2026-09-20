# Ariadne API Capability Matrix

状态说明：

- `verified`：已通过本地脚本和真实 API 验证；
- `partial`：部分验证，仍有参数、协议或边界待确认；
- `blocked`：被外部环境或缺少必要用户输入阻塞；
- `not-in-mvp`：当前不纳入 MVP。

| 模块 | 能力 | 状态 | 当前结论 |
|---|---|---|---|
| Authentication | HMAC-SHA256、`/build` 签名路径 | verified | 通过 Clash 代理后鉴权成功 |
| SDK Runtime | 重试、退避和请求观测 | verified | `npm run test:observability` 真实请求记录 duration/status/code/attempt；仅对可重试错误退避 |
| RWA | 搜索资产 | verified | 可返回 Ondo、bStocks、多链和多合约 |
| RWA | Token list | verified | 可返回 BSC 资产、市场状态和价格字段 |
| RWA | Token price | verified | 可返回 token price、reference price、更新时间 |
| RWA | Underlying profile | verified | 返回公司资料、token/share ratio 和 protections |
| Market | Token price info | verified | 可返回价格、交易量、持有人等；liquidity 可能为 null |
| Market | Candles | verified | `npm run probe:candles` 对 BSC bStocks NVDA 返回 5 条 1m OHLCV/tradeCount 数据 |
| Trading | Aggregated quote | partial | bStocks 成功；Ondo 需要 wallet address/RFQ |
| Trading | Swap build | verified | `npm run demo` 通过真实 API 返回 bStocks unsigned EVM transaction、router、gas、minReceiveAmount 和 quote TTL |
| Wallet | Supported chains | verified | BSC 查询成功 |
| Wallet | Balances by address | verified | 外层 `data[]/tokenAssets[]` 已正确展开；真实验证返回 20 个持仓，并保留风险资产、空价格和 dust warnings |
| Portfolio | Address overview | verified | `timeFrame` 使用数值枚举 1/2/3/4，返回 PnL 和交易统计 |
| Transaction | Gas/block data | verified | `npm run probe:transaction` 真实返回 BSC gas price、latest block height 和 gas limit |
| Transaction | Simulation | pending | 需要真实 unsigned tx 或构造安全测试交易 |
| Transaction | Broadcast | not-in-mvp-test | 只在后续用户明确确认后小额使用 |
| DeFi Data | Protocol list | verified | BSC 请求成功，返回分页协议列表和投资类型 |
| DeFi Data | Investment list/detail | verified | BSC Earn 列表与按 investmentId 查询详情均真实成功 |
| DeFi Data | Positions | blocked | SDK 参数已按官方文档实现；三种请求体均真实返回 `HTTP 200 / code 50000`，限额仍为 5、剩余 4，不是 `42900` 限流；已保留为外部服务端阻塞，不能降级为空持仓 |
| DeFi Transaction | Deposit/redeem/LP | pending | 需要确认具体 investmentId 和协议覆盖 |
| B402 | Pay-per-call | not-in-mvp | 当前未启用，不影响核心 SDK/MCP |

## 当前已确认的 API 设计约束

1. 同一底层股票可能有多个 platform、chain 和 contract；
2. Ondo 报价需要 RFQ 和 `userWalletAddress`；
3. 不同平台的 market status 字段可能不一致；
4. `liquidity` 为空时不能解释为零；
5. Wallet API 可能返回风险资产、空价格和 dust；
6. quote 成功不代表 swap build 一定成功；
7. 所有高风险动作必须经过计划、模拟和用户确认；
8. DeFi Positions 的业务 `50000` 与官方限流 `42900` 必须区分处理，服务端错误不能伪装成空数据。

## 2026-09-19 验收记录

- `npm run typecheck`: passed。
- `npm run probe:services`（通过 `http://127.0.0.1:7897`）：Wallet supported chains、Wallet holdings、Portfolio overview、DeFi protocol list、DeFi investment list 均返回真实数据；DeFi positions 返回 `50000 Internal server error`。
- `npm run test:mcp`（通过代理）：MCP 共发现 6 个工具，resolve、action plan、simulation 均完成真实端到端调用；尚未把该结果提升为阶段五/六 Passed，因为 Agent 实际接入、确认执行边界和完整 demo 审计仍未完成。
- `npm run demo`（通过代理）：搜索 NVDA → 比较 wrapper → bStocks quote → Swap Build → 对返回的真实 unsigned transaction 做 simulation；输出 `broadcasted: false`。
- `npm run test:observability`（通过代理）：真实 RWA search 返回成功，记录请求耗时、HTTP 200、API code 0、attempt 0，以及 `x-oc-ratelimit-limit=5`、`remaining=4`。
