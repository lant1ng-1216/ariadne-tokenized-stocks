# Ariadne 阶段验收清单

## 使用规则

本文件是阶段是否通过的唯一检查清单之一。类型检查通过不等于阶段通过；单个基础功能通过不等于阶段通过。

### 状态定义

- `Not started`：尚未开始；
- `In progress`：正在实现；
- `Partial`：部分实现，但不满足通过条件；
- `Blocked`：依赖外部服务或用户输入，已完成可行检查但无法继续；
- `Passed`：所有必做项均有实现和验证证据；
- `Failed`：验收测试失败，需要修复。

### 通过门槛

阶段只有同时满足以下条件才能标记为 `Passed`：

1. 所有必做工作项都有明确结果；
2. 每个工作项都有对应测试、日志或可复现证据；
3. 失败项已修复，或明确记录为外部 `Blocked`；
4. 没有把降级实现标记成完整实现；
5. 下一阶段依赖的接口真实可用；
6. 阶段报告列出了遗漏、风险和降级项；
7. 阶段专项验收命令全部通过。

## 阶段一：API 能力验证

目标：确认 Binance Web3 API 的真实能力和边界，不凭文档摘要假设能力存在。

| 必做项 | 实现 | 验证 | 降级/阻塞 | 状态 |
|---|---|---|---|---|
| HMAC 鉴权和 `/build` 签名 | BinanceWeb3Client | 真实 API probes | 代理请求返回 code 0 | verified |
| Clash/代理网络访问 | `proxyUrl` + undici ProxyAgent | 全部真实 API probes | 127.0.0.1:7897 可用 | verified |
| RWA 搜索 | TokenizedStocksService.search | `test:mcp`, `probe:candles` | NVDA 多平台资产返回 | verified |
| RWA Token List | marketContext | `probe:services`/Demo | BSC token list 返回 | verified |
| RWA Token Price | marketContext normalization | Demo | token/reference price 返回 | verified |
| RWA Underlying Profile | API probe | stage1 probe | 真实 profile 返回 | verified |
| Market Price Info | API probe | proxy API probe | 价格/volume/holders 返回 | verified |
| Market Candles | `TokenizedStocksService.candles` | `npm run probe:candles` | BSC bStocks NVDA 返回 5 条 1m K 线 | verified |
| Trading Aggregated Quote | TokenizedStocksService.quote | Demo/MCP | bStocks quote 成功 | verified |
| Trading RFQ 参数 | platform-aware quote + RFQ submit/status boundary | API docs + SDK method + signing-boundary test + real RFQ quote probe | SDK 可提取精确签名请求并拒绝缺字段响应；真实外部签名与 RFQ 提交延期到有资金钱包后的端到端验证 | Partial（后置验证） |
| Swap Build | `buildUnsignedAction` | `npm run demo` | 真实返回 unsigned EVM transaction；不签名、不广播 | verified |
| Wallet Supported Chains | WalletService | `probe:services` | BSC 返回 | verified |
| Wallet Balances | WalletService | `probe:services` | tokenAssets 正确展开，20 条真实持仓 | verified |
| Portfolio Overview | PortfolioService | `probe:services` | 真实 overview 返回 | verified |
| Transaction Gas/Block | `TransactionService` | `npm run probe:transaction` | BSC gas price、block height、gas limit 均返回 | verified |
| Transaction Simulation | TransactionService | `test:simulation`, Demo | 真实模拟返回 SUCCESS/FAILED 状态 | verified |
| DeFi Protocol List | DefiService | `probe:services` | 真实列表返回 | verified |
| DeFi Investment List/Detail | DefiService | `probe:services` | 列表与首条 investmentId 详情真实返回，含 investable/APY/TVL/token lists | verified |
| DeFi Positions | DefiService | `probe:services`/positions probe | 服务端持续 50000 | Blocked |
| 真实错误、延迟和限额记录 | `BinanceWeb3Error` + request observations + timeout | `npm run test:observability`, `probe:defi-positions` | 成功请求记录 code/耗时/限额；Positions 三种真实请求体均记录为 50000；仍未主动触发 429 | Partial |

阶段一通过标准：所有模块必须标记为 `verified`、`not-in-mvp` 或有明确的外部 `Blocked` 证据；不能留下未解释的 `pending`。

## 阶段二：领域模型

目标：把原始 API 响应转换成稳定、可解释、平台感知的领域对象。

| 必做项 | 实现 | 验证 | 降级/阻塞 | 状态 |
|---|---|---|---|---|
| StockAsset | domain type + normalizer | domain/MCP tests | 稳定 assetId、平台和合约身份 | verified |
| 多链/多合约/多平台身份 | `makeAssetId` + search | Demo/MCP | NVDA Ondo/bStocks BSC identities | verified |
| MarketContext | normalizer + service | SDK live example | 价格、参考价、状态和 warnings | verified |
| 缺失价格和参考价 | normalizer warnings | domain tests | 缺失字段不会被解释为零 | verified |
| off-hours 和 unknown 状态 | status normalizer | domain tests/live example | 已覆盖映射和 unknown 保留 | verified |
| WalletHolding | wallet normalizer | probe/MCP | 真实 tokenAssets 展开 | verified |
| risk token 和 dust | wallet normalizer | domain/probe | risk/dust warnings | verified |
| QuoteResult | quote normalizer | domain/MCP/Demo | quoteId、output、impact | verified |
| RFQ/standard 模式差异 | executionMode-aware quote/action boundary | domain tests + API probes/MCP discovery | 优先读取 API `executionMode`，RWA 平台回退为 RFQ；明确外部签名、广播和重试边界；真实签名提交仍需钱包 | verified |
| TradeIntent | domain type | domain/MCP | buy/sell/swap intent | verified |
| ActionPlan | action-plan module | domain/MCP | status、expiry、confirmation | verified |
| SimulationResult | simulation normalizer | simulation/MCP | status/failReason/balance changes | verified |
| SafetyReport | safety evaluator | domain/MCP | blocking/warning checks | verified |
| Decimal/金额精度 | BigInt scaled decimal normalizer | `npm run test:domain` | 高精度 price gap 边界测试通过 | verified |
| 统一错误类型 | `BinanceWeb3Error` | `npm run test:observability` + domain tests | 统一 status/code/retryable/details | verified |
| 失败、过期和重复状态测试 | action-plan tests | `test:domain` | 过期、错误 token、未确认执行均拒绝 | verified |

阶段二通过标准：领域模型必须覆盖所有进入 MVP 的真实响应类型，并有成功、失败、缺失字段和边界测试。

## 阶段三：SDK

目标：开发者可以通过 SDK 使用高层能力，不必直接拼接底层 endpoint。

| 必做项 | 实现 | 验证 | 降级/阻塞 | 状态 |
|---|---|---|---|---|
| Binance API Adapter | `BinanceWeb3Client` | observability/real probes | 签名客户端真实请求成功 | verified |
| GET/POST/签名/代理 | client methods | `test:observability`, probes | GET/POST/ProxyAgent 真实通过 | verified |
| AssetResolver | `TokenizedStocksService.search` | `test:mcp`, Demo | 多平台资产身份真实返回 | verified |
| MarketContext Service | `marketContext` + candles | Demo/`probe:candles` | 真实价格、状态、K 线 | verified |
| Wallet/Portfolio Service | Wallet/Portfolio services | `probe:services`, `test:mcp` | 真实持仓和 overview | verified |
| Quote Engine | `quote` | Demo/MCP | 真实 bStocks quote | verified |
| Swap Build Service | `buildUnsignedAction` | Demo | 真实 unsigned tx | verified |
| Transaction Simulation Service | TransactionService | `test:simulation`, MCP | 真实 simulation 状态 | verified |
| ActionPlan Service | ActionPlan + safety | domain/MCP tests | 创建、模拟回写、成功确认、失败模拟拒绝、过期拒绝、重复确认拒绝、已确认计划禁止重新写入模拟结果 | verified |
| Executor 边界 | ExecutionService | `test:domain` | signer/broadcaster 注入；默认不广播 | verified |
| 错误重试和速率限制 | retry/backoff + BinanceWeb3Error | `probe:retry`, `test:retry-policy`, `test:observability` | 真实 50000 已验证；本地确定性测试验证 `42900` 重试、`Retry-After`、不可重试参数错误分类 | verified |
| SDK 公共导出 | `src/index.ts` | typecheck/import path | services/domain/errors 已导出 | verified |
| SDK 使用示例 | `examples/sdk-usage.ts` + SDK_USAGE | `npm run example:sdk` | 真实搜索 NVDA 多平台资产并返回 market context | verified |
| 只读和真实 API 集成测试 | probes + MCP | 多项真实 probes | 核心流程真实通过；DeFi positions 阻塞 | Partial |

阶段三通过标准：至少一条真实 API 端到端 SDK 流程必须完成搜索、上下文、报价、交易构建或明确的阻塞处理和模拟。

## 阶段四：交易计划与安全执行

目标：所有有副作用的动作都必须经过计划、安全检查、模拟和用户确认边界。

| 必做项 | 实现 | 验证 | 降级/阻塞 | 状态 |
|---|---|---|---|---|
| ActionPlan 状态机 | `attachSimulation`/`confirmPlan`/`assertExecutable` | `test:domain`, `test:mcp` | 模拟、确认、执行前置条件 | verified |
| quote TTL/计划失效 | `isPlanExpired` + build expiry | `test:domain`, Demo | 过期计划确认/执行拒绝 | verified |
| 资产身份检查 | `evaluateSafety` | domain/MCP | 缺少关键身份字段会阻断 | verified |
| 市场状态检查 | `evaluateSafety` + MarketContext | domain/live example | closed/halted 或 openState=false 阻断；unknown 仅 warning；状态保留 | verified |
| 报价和滑点检查 | `price_impact` + `slippage_limit` safety checks | `npm run test:domain`, real MCP/Demo | price impact and 0–10000 bps slippage boundaries enforced | verified |
| 授权检查 | QuoteRoute.approvalTarget + `buildApprovalAction` + EVM allowance read | `npm run probe:approval`, domain/MCP | 真实返回 approve calldata、spender、gas，并读取当前 allowance；授权不足或无法读取时阻断计划 | verified |
| Simulation 集成 | `simulate_stock_action_plan` + `attachSimulation` | `npm run test:mcp` | 真实 unsigned action 模拟结果回写计划；业务 FAILED 不再被外层 code 0 掩盖 | verified |
| 余额变化检查 | SimulationResult balanceChanges | simulation/MCP | 结构化 balanceChanges 已保留；真实交易后的余额变化延期到后置端到端验证 | Partial（后置验证） |
| 用户确认边界 | `confirm_stock_action_plan` | `test:mcp` | 确认工具不签名不广播 | verified |
| 未确认时拒绝执行 | `assertExecutable` / ExecutionService | `test:domain`, MCP confirmation test | 未确认计划拒绝 | verified |
| 执行后状态查询 | `transactionsByAddress` / `transactionDetail` / `broadcastOrders` | `npm run probe:post-transaction` | 真实历史详情与广播订单查询均可用；广播订单查询不要求测试时发送新交易 | verified |
| 失败和重试策略 | BinanceWeb3Error retry/backoff + no automatic broadcast retry | `test:observability`, `test:retry-policy`, `test:domain` | 预执行可重试；广播失败只调用一次，提供复用同一已签名 payload 的路径，必须先查询链上状态，禁止盲目重签/重播 | verified |

阶段四通过标准：能证明未确认的计划不能执行；模拟结果能够回写计划；安全检查失败时会阻断，而不是只显示 warning。

## 阶段五：MCP

目标：现有 Agent 可以通过 MCP 使用 SDK，而不是 Ariadne 自己实现 Agent。

| 必做项 | 实现 | 验证 | 降级/阻塞 | 状态 |
|---|---|---|---|---|
| 标准 MCP Server | stdio McpServer | `test:mcp` | 标准 stdio server 可连接 | verified |
| 工具发现 | MCP listTools | `test:mcp` | 8 个工具真实发现 | verified |
| resolve 工具 | `resolve_tokenized_stock` | `test:mcp` | NVDA 真实搜索 | verified |
| compare 工具 | `compare_stock_wrappers` | `test:mcp`, Demo | 真实 NVDA wrapper 比较 | verified |
| market context 工具 | `get_stock_market_context` | live MCP path | 真实市场上下文工具 | verified |
| wallet exposure 工具 | `get_wallet_stock_exposure` | `npm run test:mcp` | 真实 MCP 调用返回 100 条结构化 Wallet holdings | verified |
| action plan 工具 | `create_stock_action_plan` | `test:mcp`/Demo | quote/build/safety plan | verified |
| simulation 工具 | `simulate_stock_action` | `test:mcp` | 真实 simulation tool 调用 | verified |
| confirmed execution 工具 | `confirm_stock_action_plan` + `broadcast_confirmed_transaction` | MCP discovery/typecheck | 仅接受 confirmed plan 和外部签名 raw transaction；默认不签名；真实广播延期到后置端到端验证 | Partial（后置验证） |
| 只读/有副作用工具区分 | descriptions + no broadcast boundary | MCP tests | 所有当前工具不广播 | verified |
| 结构化结果和 warnings | JSON content responses | MCP tests | 结构化 plan/simulation/warnings | verified |
| MCP Client 自动化测试 | stdio SDK client | `test:mcp` | 真实 MCP client 全流程 | verified |
| Codex/Claude Code 实际接入测试 | MCP config + stdio client | Codex 新对话真实调用 `resolve_tokenized_stock(NVDA, 56)`，返回 Ondo 与 bStocks 两个资产 | Claude Code 未测试；Codex 已通过 | verified |

阶段五通过标准：至少一个现有 Agent 客户端完成搜索、理解、计划、模拟流程；工具不能在未确认时执行真实交易。

## 阶段六：端到端 Demo

目标：形成可被评委运行和理解的工作项目。

| 必做项 | 实现 | 验证 | 降级/阻塞 | 状态 |
|---|---|---|---|---|
| README | README.md | docs/config checks | 安装、运行、安全边界和工具说明 | verified |
| 本地安装说明 | README/docs | config/typecheck | npm 安装和 env 说明 | verified |
| MCP 配置说明 | config example + docs | `test:mcp-config` | 无密钥配置模板 | verified |
| 搜索多个股票版本 | Demo | `npm run demo` | NVDA 多平台 | verified |
| 展示市场上下文 | Demo/SDK example | live runs | 真实 context | verified |
| 获取真实报价 | Demo | live run | bStocks quote | verified |
| 生成交易计划 | Demo | live run | unsigned action plan | verified |
| 交易模拟 | Demo/MCP | live MCP | 真实 unsigned tx 模拟 | verified |
| 用户确认步骤 | `confirm_stock_action_plan` | `test:mcp`, domain tests | 真实模拟回写后成功确认；未就绪计划仍被拒绝；确认不签名不广播 | verified |
| 真实或完整 dry-run 链路 | `demo` + MCP tests | live runs + no-funds Preview | 无资金 Preview 完成搜索→比较→quote→安全检查，并在 allowance/余额不足处明确阻断；不伪造模拟成功或广播；有资金钱包时再执行真实 unsigned-tx simulation | verified |
| Demo 视频 |  |  |  | Not started |
| 可复现运行命令 | package scripts | `npm run demo`/probes | 真实命令已提供 | verified |
| 评委无密钥运行说明 | README + MCP config example | `test:mcp-config` | 配置模板无密钥；API 仍需参赛者 credentials | Partial |

阶段六通过标准：Demo 必须完成一条从 Agent 输入到交易计划、模拟和明确安全终点的完整链路，并且能被第三方按文档复现。

## 当前审计结论

截至本文件创建时，阶段一至六均不得标记为 `Passed`。现有代码是可运行原型，但仍有明确的 partial 项。后续工作必须先更新本表，再根据本表推进，不能仅凭新增代码数量判断阶段完成。
