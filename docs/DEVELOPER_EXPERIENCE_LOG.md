# Ariadne Developer Experience Log

本文件记录 Ariadne 在 BNB Hack: Tokenized Stocks Edition 期间的真实开发过程，用于后续整理 Developer Experience Report。

## 比赛要求摘要

官方要求 Developer Experience Report 记录：

- 从打开文档到第一次成功 API 调用所需时间；
- 文档中具体的问题和位置；
- 难以理解的错误信息；
- API 边界情况和延迟；
- Wallet Skills、Agentic Wallet 或 CLI 的使用体验；
- 代币化股票的流动性、滑点、传统市场闭市时的行为；
- bStocks、Ondo 和 xStocks 的实际差异；
- 对 API、SDK 和文档的改进建议。

## 2026-09-19：首次接入

### 环境

- 项目：Ariadne — Tokenized Stocks SDK & MCP
- 目标链：BSC，chain ID `56`
- 本地系统：macOS
- Node.js：v26.7.0
- npm：v11.19.0
- 本地网络：Clash HTTP proxy `127.0.0.1:7897`
- API 权限：Trade、Market、Transaction、Wallet、DeFi
- B402 Payments：未启用，当前 MVP 不需要

### 文档路径

- API 概览：<https://web3.binance.com/zh-CN/dev-docs/introduction>
- 鉴权：<https://web3.binance.com/zh-CN/dev-docs/authentication>
- RWA Data：<https://web3.binance.com/zh-CN/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data>
- 比赛页面：<https://www.bnbchain.org/en/hackathons/tokenized-stocks>

### 首次失败

最初使用 Node.js 原生 `fetch` 直接请求 `https://web3.binance.com/build`，请求出现 HTTPS connection timeout。

错误类型：

```text
TypeError: fetch failed
ConnectTimeoutError: Connect Timeout Error
```

这不是 API Key、签名或权限错误，因为请求没有到达服务端并返回 HTTP/业务错误码。

### 定位与解决

用户本地使用 Clash，HTTP 代理端口为 `7897`。将只读测试请求改为通过：

```text
http://127.0.0.1:7897
```

代理后，API 鉴权和请求均成功。

### 鉴权验证结果

官方要求：

- `X-OC-APIKEY`；
- `X-OC-TIMESTAMP`；
- `X-OC-SIGN`；
- HMAC-SHA256；
- 签名路径必须包含 `/build`。

Ariadne 当前客户端已经实现该签名方式，类型检查通过。

### 第一个成功请求

接口：

```text
GET /build/api/v1/dex/market/supported/chain
```

结果：

- HTTP 请求成功；
- `code: 0`；
- `success: true`；
- 成功返回 BSC、Ethereum、Solana 等支持链。

### 第一个 RWA 成功请求

接口：

```text
GET /build/api/v1/dex/market/rwa/search?keyword=NVDA
```

结果：搜索成功，返回了：

- Ondo `NVDAon` on BSC；
- Ondo `NVDAon` on Solana；
- Ondo `NVDAon` on Ethereum；
- bStocks `NVDAB` on BSC。

### 初步产品发现

同一个底层公司可以对应多个平台、多个链和多个合约地址。仅使用 `NVDA` 作为执行参数是不安全的，SDK 必须把以下字段视为资产身份的一部分：

- chain ID；
- token contract address；
- platform ID；
- token symbol；
- underlying ticker。

这直接支持 Ariadne 的核心设计：先解析资产身份，再生成交易计划，不能让 Agent 根据模糊 ticker 直接执行。

### RWA 价格接口测试

接口：

```text
GET /build/api/v1/dex/market/rwa/price
```

测试资产：BSC 上搜索到的 NVDA Ondo 与 bStocks 资产。

测试结果：

| 平台 | 代币 | 链上代币价格 | referencePrice | 更新时间字段 |
|---|---|---:|---:|---:|
| Ondo | NVDAon | 222.626205468664753101 | 222.245 | 1789816116428 |
| bStocks | NVDAB | 222.02000000 | 221.847353 | 1789816113632 |

观察：

- 两个平台的同一底层资产返回了不同的 token price 和 referencePrice；
- 不能把“NVDA 当前价格”压缩成一个无来源的数字；
- `referencePrice` 需要连同更新时间和平台一起展示；
- SDK 可以计算 token price 与 referencePrice 的差值，但不应直接把差值解释成套利机会或公平价值；
- 两个平台的价格差异可以成为 Ariadne 资产比较和交易前检查的一部分。

本次调用仍然是只读请求，没有构建或广播交易。

### RWA Token List 与 Market API 测试

RWA token list 接口返回了 BSC 上约 488 个资产记录。NVDA 匹配结果：

| 平台 | 代币 | marketStatus | openState | tokenPrice | referencePrice |
|---|---|---|---|---:|---:|
| Ondo | NVDAon | `offhours` | `true` | 222.9779617963605 | 222.596154011 | 
| bStocks | NVDAB | `null` | `true` | 222.1527501086483 | 221.98 |

观察：

- `openState: true` 不代表传统股票市场处于正常交易时段；Ondo 明确返回了 `offhours`；
- bStocks 的 `marketStatus` 在本次响应中为 `null`，说明 SDK 不能假设所有发行平台都提供相同的状态字段；
- 两个平台的 `nextOpenTime` 字段也不一致；
- 同一个底层资产的不同包装需要分别展示状态，不能只显示一个 NVDA 总状态。

通用 Market API 价格信息测试成功，返回了价格变化、24 小时成交量和持有地址数量。但本次两个资产的 `liquidity` 字段均为 `null`。

这产生了一个重要的产品和开发者体验要求：当某字段缺失时，Ariadne 必须明确返回“数据不可用”，不能将 null 解释为零流动性，也不能自行补全为估算值。

本次测试仍为只读请求，没有执行交易。

### Wallet API 测试

Wallet API 的 BSC 支持链查询成功：

- `code: 0`；
- `success: true`；
- 返回 BSC 支持。

使用全零地址测试 `all-token-balances-by-address` 时，接口返回了多个资产记录，其中包含风险标记资产、空价格字段和极小余额的 LP token。由于这是全零地址，不应把这些记录解释成真实用户持仓；它们更像是索引器对该地址的链上资产记录。

对 Ariadne 的影响：

- 钱包余额结果必须保留 `isRiskToken`；
- 空的 `tokenPrice` 不能被转换为 0；
- 极小余额可能是 dust，不能直接当成用户有意义的持仓；
- SDK 的“股票持仓”层需要根据 RWA 资产身份二次筛选，而不能直接把 Wallet API 的全部 tokenAssets 当作股票资产。

本次测试仍为只读请求，没有读取用户真实钱包，也没有执行交易。

### 阶段一补充探测

补测结果：

- RWA underlying profile：成功，返回 `protections`、`companyInfo`、`tokenToShareRatio` 等字段；
- Portfolio overview：成功；`timeFrame` 不是 `1D` 字符串，而是数值枚举 `1/2/3/4`，首次使用字符串时返回 `40001`；
- DeFi protocol list：成功；
- DeFi investment list：成功；
- DeFi positions：请求体按照文档改为 `addresses` 后，仍连续两次返回 `50000 Internal server error`。

阶段一验收结论：

- 相关模块已经全部完成至少一次能力探测；
- 已将每项能力分类为 verified、partial、blocked 或 not-in-mvp；
- 发现的 API 限制和文档/参数问题已记录；
- DeFi positions 和 Swap build 的服务端问题不再被假设为已支持。

阶段一可以进入下一阶段，但这两个 partial 项必须保留在风险清单中，不能在产品文档中宣称已经解决。

## 阶段二至阶段六验收记录

### 阶段二：领域模型

- `StockAsset`、`MarketContext`、`WalletHolding`、`QuoteResult`、`ActionPlan`、`SimulationResult` 和 `SafetyReport` 已建立；
- 已处理 off-hours、null liquidity、空 token price、risk token 和 dust；
- `npm run test:domain` 通过。

### 阶段三：SDK

- SDK 已提供资产搜索、市场上下文、平台感知报价和 ActionPlan 生成；
- Binance client 已支持 GET、POST、HMAC 签名和本地 Clash ProxyAgent；
- TypeScript 类型检查通过。

### 阶段四：安全与模拟

- Transaction API simulation 已通过真实 BSC 只读测试；
- 模拟状态为 `SUCCESS`；
- 没有广播交易；
- 模拟结果包含 balance changes、allowance changes 和 warnings 字段。

### 阶段五：MCP

- MCP Server 已启动；
- MCP 客户端真实发现 3 个工具；
- `resolve_tokenized_stock` 调用成功；
- `create_stock_action_plan` 调用成功；
- MCP 测试通过。

### 阶段六：端到端 Demo

- 已有 README、Demo Script 和本地可复现命令；
- Demo 覆盖搜索、资产识别、报价、交易计划和“不执行”安全边界；
- 自动化 MCP 测试通过；
- 真实交易广播尚未纳入自动化测试，避免在未经过用户确认时产生外部状态变化。

## 2026-09-19：SDK 领域层开始实现

已完成第一版领域模型和两个核心服务：

- `StockAsset`：统一链、合约、平台和底层股票身份；
- `MarketContext`：统一价格、参考价、市场状态和数据警告；
- `AssetResolver`：基于 RWA Search 将搜索结果转换为 `StockAsset`；
- `MarketContext` service：根据链和合约从 RWA token list 获取资产上下文；
- Binance client：增加 POST 能力，为后续报价和交易构建做准备。

当前 `npm run typecheck` 已通过。由于本地 Node 原生 fetch 需要经过 Clash 代理，真实集成测试仍通过代理测试脚本进行；下一步会把代理配置正式抽象为开发环境 Transport，避免核心 SDK 直接依赖 curl。

### Trading API 聚合报价测试

测试输入：BSC 上 10 USDT（18 位精度）兑换 NVDA 代币版本。

#### Ondo NVDAon

请求失败，返回：

```text
code: 40001
message: userWalletAddress is required for RFQ (Ondo) quote
```

这说明 Ondo 的报价路径属于 RFQ，需要用户钱包地址，不能像普通 DEX 聚合报价一样只用输入代币、输出代币和金额完成查询。SDK 需要把 `userWalletAddress` 作为有条件的必填参数，并向 Agent 解释原因。

#### bStocks NVDAB

请求成功：

- `code: 0`；
- 返回 `quoteId`；
- 返回 `toTokenAmount`；
- 本次 10 USDT 预计获得 `45038042867610102` 个最小单位的 NVDAB。

当前响应没有直接返回 `minToTokenAmount` 或 `priceImpact` 字段，因此 Ariadne 不能假设所有报价路径都会提供相同的滑点字段。后续需要结合交易构建和模拟结果计算或展示实际结果。

### 新的产品发现

不同发行平台不仅资产字段不同，交易报价要求也不同：

- Ondo 需要 RFQ 和用户钱包地址；
- bStocks 可以返回普通聚合报价；
- Agent 不能使用同一套“无条件报价”逻辑处理所有平台。

这进一步证明 Ariadne 的 SDK 需要提供平台感知的交易计划，而不是简单统一成一个没有上下文的 `swap()` 方法。

### Ondo RFQ 参数补测

为验证错误信息中的要求，向同一个 Ondo 报价请求加入 `userWalletAddress` 参数，并使用全零 EVM 地址作为无资金测试地址。

结果：

- `code: 0`；
- `success: true`；
- 返回 1 条 RFQ route。

这说明此前的失败不是资产不可报价，而是请求缺少平台特定的用户地址参数。实际产品不能把钱包地址当成可选的通用字段，而应根据平台和报价类型决定必填参数。

本次使用的是全零地址，仅用于接口行为验证，没有读取或操作用户钱包。

### RFQ 官方流程与安全边界复核（2026-09-20）

官方流程明确为：`quote` → 选择 RFQ route → `swap` → 对 `rfq.typedDataToSign` 使用 EIP-712 签名 → `order/submit` → 轮询 `order/{orderId}`。提交请求中的 `vendor` 必须与 swap 返回的 `rfq.vendor` 一致，`quoteId` 字段实际应传 swap 返回的 `rfq.orderId`；同一订单重试必须复用 `requestId`，新订单才生成新的 UUID。

- 真实只读探针确认 Ondo 在提供 `userWalletAddress` 后返回 RFQ route；未提供时返回 `40001`，错误信息明确要求钱包地址；
- SDK 的 RFQ swap 构建现在要求响应同时包含 `typedDataToSign`、`vendor` 和 `orderId`，否则直接阻断后续签名；
- MCP 的 `submit_signed_rfq_order` 将 vendor 限制为官方枚举 `InchFusion`、`CowSwap`、`PcsXRfq`；
- Ariadne 不生成签名、不接触私钥；真实订单提交仍需外部钱包明确签名，因此本项继续保持 Partial，而不是伪造 Passed。

### bStocks Swap 构建测试

尝试使用刚获取的 bStocks `quoteId` 调用 Swap 构建接口，并使用全零地址作为 unsigned transaction 的用户地址。

结果：

```text
code: 000002
data: null
```

当前错误消息没有被返回或没有被当前响应解析器识别。可能原因包括：

- Swap 构建接口的请求体字段与当前假设不同；
- quoteId 对应的构建参数不完整；
- 全零地址不满足该接口的校验；
- quote 在构建时已经失效；
- 文档中的 endpoint 或响应结构需要进一步核对。

这是一个需要记录的 API 可用性问题：聚合报价成功并不代表使用一个 quoteId 就能直接构建 Swap，报价与交易构建之间存在额外参数和状态约束。下一步需要精读 Trading API 的 Swap schema，并保留完整原始错误响应，而不是只打印 `code`。

## 待记录项目

- RWA token list 和详细信息字段；
- token price 与 reference price 的时间戳；
- 传统市场开闭市状态；
- Market API 返回的流动性、交易量和报价延迟；
- Trading API 的 quote TTL 和实际滑点；
- Transaction API 模拟结果；
- Wallet API 对股票代币余额的识别；
- MCP 接入 Codex 或 Claude Code 的时间和问题；
- 文档缺失、字段命名不一致或错误信息不清楚的地方。
### DeFi Investment Detail 补测（2026-09-20）

从真实 `List DeFi Investments` 返回的首条 `investmentId` 出发，调用官方 `POST /api/v1/defi/data/investment/detail`，请求体使用 `binanceChainId` 与 `investmentId`。

- HTTP/API business response：`code=0`、`success=true`；
- 返回 `investable`、`apyBps`、`apyDisplay`、`tvl`、协议标识及资产/奖励 token 列表；
- SDK 已加入 `DefiService.investmentDetail()`，并纳入 `probe:services`；
- 该项已从 Partial 更新为 verified；DeFi Positions 仍单独记录为服务端 `50000` 阻塞。
### ERC-20 allowance 读取补测（2026-09-20）

在真实 bStocks NVDA 报价与 approve calldata 基础上，使用 BSC JSON-RPC `eth_call` 查询 `allowance(owner, spender)`：

- Binance approve API 返回真实 spender、calldata、gasLimit 和 gasPrice；
- BSC RPC 成功读取当前 allowance，测试地址结果为 `0`；
- ActionPlan 创建时若报价声明 approval target，会读取 allowance；授权不足或读取失败会阻断计划；
- 该流程不签名、不广播交易。
### DeFi Positions 超时与请求体复核（2026-09-20）

为避免请求异常时探针无输出，Binance client 新增可配置 `timeoutMs`；Positions 探针使用 10 秒超时、关闭重试，依次测试三种请求体：

- 文档字段：`addresses` + `binanceChainIds`；
- `chainIds` 别名；
- 文档字段加分页参数。

三种变体均稳定返回 HTTP 200、业务错误 `50000 Internal server error, please retry later`。因此当前证据支持“官方服务端阻塞”，不是请求挂起或字段别名问题；本项继续保持 Blocked。
### 错误响应的限额头记录（2026-09-20）

Binance client 现在同时保留成功和错误响应中的 `rate`、`limit`、`retry-after` 相关 headers，并通过 `RequestObservation` 输出；这使 429/50000 发生时仍能记录限额上下文，而不是只留下错误码。
### 真实 50000 重试探针（2026-09-20）

单独对官方 DeFi Positions 请求运行一次重试（`maxRetries=1`、退避 10ms）：

- attempt 0：HTTP 200、business code `50000`、耗时约 4.36s；
- attempt 1：HTTP 200、business code `50000`、耗时约 4.25s；
- 两次均记录 `x-oc-ratelimit-limit=5`、`x-oc-ratelimit-remaining=4`；
- 最终保留统一 `BinanceWeb3Error`，没有把服务端失败伪装成成功。

这证明预执行重试和错误观测有效，但不等同于真实 429 限流测试。
官方文档复核补充：DeFi API 的默认限频为 5 QPS，限流错误码为 `42900`；`50000` 的定义是服务端内部错误。因此本次 Positions 实测不能归因于限流：三次变体均记录 `remaining=4`，且没有返回 `42900`。客户端和 MCP 层必须把该响应暴露为明确的服务端错误，不能将其转换为空持仓或正常结果。
### 限流重试策略补测（2026-09-20）

客户端将 `42900`、`50000`、`50001` 和 HTTP 5xx 分类为可重试错误，将参数/鉴权类错误保留为不可重试；当响应包含 `Retry-After` 时优先遵守该等待时间，否则使用指数退避。`test:retry-policy` 使用本地确定性 HTTP 测试服务验证了 `42900 → Retry-After → 成功` 的两次请求链路，并保留每次 attempt 的观测记录。真实 API 仍未主动制造 429，避免对共享限额进行破坏性测试。
### Broadcast API 无效签名探针（2026-09-20）

使用 `broadcastSigned()` 调用真实 BSC 广播接口，传入明显无效的 raw transaction `0x01` 与零地址；接口未产生链上交易，但返回 HTTP 200 / business code `50000`。这验证了客户端广播错误路径，不能替代成功广播验收，因此真实执行闭环继续保持 Partial。

### 广播失败恢复策略补测（2026-09-20）

执行器现在把预执行签名与广播分开：`signConfirmed()` 只签名一次，`broadcastSignedActions()` 接收已签名 payload 并执行一次广播调用。广播超时或返回不确定结果时，调用方必须先查询交易历史/广播订单状态，再决定是否复用同一签名 payload；系统不会自动重签或盲目重播。

- 确定性测试验证广播异常时 broadcaster 只被调用一次；
- 没有成功链上交易，因此不把失败恢复测试误标记为真实成功广播；
- 真实无效 raw transaction 探针仍记录为服务端 `50000`，与成功执行闭环区分。

### Codex MCP 接入复测（2026-09-20）

- 已将 `ariadne-tokenized-stocks` 注册到本机 Codex CLI 的全局 MCP 配置；配置使用绝对启动路径和项目 `.env`，没有把 API credentials 写入 Codex 配置；
- `codex mcp get ariadne-tokenized-stocks` 能正确显示 stdio command、`--env-file`、`tsx` 和 Ariadne server 路径；
- 独立 MCP stdio client 已真实发现 12 个工具并完成只读/计划/模拟/确认边界测试；
- 通过 Codex CLI 发起的非交互 smoke test 未产生可核验的工具调用输出，推断当前 Codex 进程尚未重新加载新增 MCP 配置；因此不能把它记录为 Codex UI 端到端通过，仍保留为 Partial。需要重新启动 Codex 会话后再做一次只读 `resolve_tokenized_stock` 调用。

用户随后在新 Codex 对话中完成真实调用：`resolve_tokenized_stock(NVDA, 56)` 返回 2 个 BSC 资产——Ondo `NVDAon` 和 bStocks `NVDAB`，并返回了对应合约地址。该截图作为 Codex 实际客户端接入证据，故本项更新为 verified；Claude Code 仍未单独测试。

### 无资金 Preview 方案（2026-09-20）

为避免要求评委或开发者充值，Demo 将无资金钱包定义为安全终点：搜索、平台比较、市场上下文和报价仍使用真实 API；随后读取 allowance，若为零或无法满足报价要求，则将计划标记为 `failed` 并展示明确的 blocking reason。该模式不跳过安全检查、不伪造交易模拟成功、不签名、不广播。成功的 unsigned-tx simulation 仍保留给有资金钱包的可选验证路径。

### RFQ / Standard 统一执行边界（2026-09-20）

执行模式现在优先读取报价或 Swap 响应中的 `executionMode`，而不是仅凭平台名称猜测。对 Ondo、bStocks 和 xStocks 等 RWA 平台，在 API 未返回模式时回退为 RFQ；普通资产回退为 Standard Swap。RFQ 必须包含外部签名所需的 `typedDataToSign`、vendor 和 orderId；Standard Swap 则保留 unsigned EVM transaction。两种模式都明确要求外部签名和广播，广播不自动重试。

SDK 新增 `prepareRfqSigningRequest()`，从 RFQ unsigned action 中提取 `typedDataToSign`、vendor、orderId 和 signingScheme，供外部钱包调用 `eth_signTypedData_v4`。该方法只准备签名请求，不生成签名、不提交订单；因此不需要私钥，也不会产生链上副作用。

### 后置真实交易验证清单（2026-09-20）

以下工作暂不在当前无资金开发阶段执行，等用户准备好有资金的钱包后联动验证：

1. 外部钱包对 RFQ `typedDataToSign` 做 EIP-712 签名并提交订单；
2. 真实广播已确认的 signed transaction；
3. 查询订单/链上状态并验证交易后的余额变化。

这些不是 Ariadne 私钥管理或签名生成能力的缺失，而是外部钱包参与的端到端验证。当前已完成所有无副作用的签名准备、确认边界、拒绝路径和状态查询能力。
