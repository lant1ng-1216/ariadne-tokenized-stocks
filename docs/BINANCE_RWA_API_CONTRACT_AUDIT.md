# Binance Web3 RWA API 契约审查

审查日期：2026-10-03
官方来源：[Binance Web3 API — RWA Data](https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data)
结构化记录：[`records/phase27-binance-rwa-contract.json`](../records/phase27-binance-rwa-contract.json)

### 官方文档定位

以下行号对应本次审查读取的 Binance 官方 RWA Data 页面渲染内容，便于复核字段，不代表 API 请求结果：

- **Get RWA Token Issuance Platforms**，第 80–252 行：`tickerCount`、链分布的 `tokenCount` 和包级 `timestamp`。
- **Get RWA Token Price**，第 259–428 行：查询上限、逐资产 `tokenPriceUpdatedAt` 和包级 `timestamp`。
- **Search RWA Token**，第 435–632 行：`keyword`、`platformId`、跨链/平台资产及 `assetType`。
- **Get RWA Token List**，第 855–1232 行：`binanceChainId`、`platformId`、`tabId`、`assetType`、完整 `statusInfo` 及包级 `timestamp`。该渲染段落未列出分页/总数参数，也未列出逐项 `tokenPriceUpdatedAt` 或 `liquidity`。

原文均位于同一[官方 Binance Web3 RWA Data 文档](https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data)。OpenAPI 下载链接本次超时，故以上是对可见官方页面的逐项记录，不是对下载 schema 或运行时响应的声称。

## 结论先行

> **时间边界：** 本文中的“缺口”与字段映射是 Phase 27 审查时的代码快照结论，不代表当前代码仍然丢失这些字段。Phase 28 已按下方的本地合成测试修复；最终是否通过阶段审批以 Jev 门禁记录为准。当前实现证据另见 [`records/phase28-source-confirmed-fidelity.json`](../records/phase28-source-confirmed-fidelity.json)。

Phase 26 记录的两个聚合值分别是 545 和 488，算术差为 57。官方文档把 `tickerCount` 定义为底层资产数量（number of underlying assets），把 `chainDistribution.tokenCount` 定义为该链上的 RWA token 数量（number of RWA tokens on this chain）；同一底层资产部署在不同链时分别计数。这解释了官方字段的计数单位，但不能单凭字段定义证明 Phase 26 两种聚合在筛选范围、时点或完整性上完全一致。

这组观测中的 545 不是平台级 `tickerCount`：它是 Phase 26 记录中所有 BSC `chainDistribution.tokenCount` 的合计；488 是返回目录行按“chainId + 小写合约地址”去重后的数量。Phase 26 的结构化记录保留了计算方法和聚合值，但出于数据最小化没有保存原始行或地址，因此不能从该公开记录独立重算每个聚合。它只支持“这次记录的两个聚合值相差 57”这一有限结论，不证明目录缺少恰好 57 个真实资产，也不证明两个聚合完全同口径。

但官方页面渲染出的 token-list 契约没有描述分页参数、总数或续页标记；下载 OpenAPI schema 的链接在本次审查时超时，且没有再次调用 Binance 接口。因此我们不能把 57 条差额归因于分页，也不能据此断言接口运行时绝无未公开分页行为；文档中未列出分页，不证明运行时不存在未公开行为。当前准确结论仍是：差额原因不明，目录完整性未被验证。

## 官方契约明确说明的内容

- `/api/v1/dex/market/rwa/platforms` 的 `tickerCount` 是 RWA token 对应的底层资产数量；`chainDistribution.tokenCount` 是某条链上的 RWA token 数量，跨链部署的同一底层资产分别计数。
- `/api/v1/dex/market/rwa/tokens` 支持可选 `binanceChainId`、`platformId` 和 `tabId`；省略相应过滤条件时，文档分别说明返回所有链、所有平台和所有板块。板块编号文档列为 1–13。
- Token-list 项包含 `assetType`：1 为 Stock、2 为 Pre-IPO、3 为 ETF。市场状态枚举包括 `premarket`、`regular`、`postmarket`、`overnight`、`closed`、`pause`；另有 `openState`、`reasonCode`、`reasonMsg`、`nextOpenTime` 和 `nextCloseTime`。
- Token-list 响应有包级服务端时间戳。页面列出的 token-list 字段没有逐 token 的 `tokenPriceUpdatedAt` 或 `liquidity`；单独的 `/api/v1/dex/market/rwa/price` 则提供每个 token 的 `tokenPriceUpdatedAt`，并与包级响应时间戳分开。
- `/api/v1/dex/market/rwa/search` 的文档化查询为必填 `keyword` 和可选 `platformId`，结果可包含跨平台、跨链表示；页面未列出 `chainId` 搜索参数。Ariadne 当前在本地按 chainId 过滤搜索结果。
- Phase 27 审查快照发现：搜索响应中的 `assetType` 未进入下游模型；token-list 类型/领域模型未保留 `reasonCode`、`reasonMsg` 和 `nextCloseTime`。Phase 28 候选实现现已保留这些字段；精确上游状态与内部安全状态并存，后者仍为 `open`、`closed`、`offhours`、`unknown` 四类。

## 不能从文档推断的内容

- 未证实目录接口完整返回所有可发现 RWA，也未证实任何特定股票或发行方一定会被列出。
- 文档未解释平台统计与目录返回数之间如何保持同步，也未说明是否存在隐藏的截断、分页或服务端排除规则。
- 两个 `tabId` 返回相同身份集合这一 Phase 26 观测，不证明 tab filter 被忽略；本次没有重放这些请求。
- 返回时间戳不能单独证明报价达到某个新鲜度标准或 SLA。

## Phase 27 审查快照：文档字段到 Ariadne 数据路径的逐项核对

这次审查不把“代码里有一个相似字段”当作“用户实际收到该字段”。下面沿着上游响应类型、归一化入口和对外领域模型逐段核对；字段级明细也保存在结构化交叉表 `records/phase27-binance-rwa-contract.json` 的 `sourceCodeCrosswalk` 中。

| 官方文档字段 | Phase 27 审查时的代码路径 | 当时确认的缺口 |
| --- | --- | --- |
| `assetType`（Stock / Pre-IPO / ETF） | `src/services/tokenized-stocks.ts` 的 `RwaSearchResponse` 有声明，但 `search()` 构造归一化输入时没有传入；token-list 的 `RwaTokenResponse` 没有声明。`src/domain/types.ts` 的 `StockAsset`、`TokenizedStockListing` 也没有该字段。 | 搜索和列表结果都不能可靠地把资产类别交给 SDK/MCP/UI 使用。 |
| `marketStatus`、`openState`、`nextOpenTime`、`reasonCode`、`reasonMsg`、`nextCloseTime` | token-list `RwaTokenResponse.statusInfo` 只声明前三项；`normalizeMarketContext()` 只保留其中的 `openState` 和 `nextOpenTime`，`MarketContext` 无原因码、原因文本或下一次收盘时间。`normalizeMarketStatus()` 把多个原始状态归并为 `open`、`closed`、`offhours`、`unknown`。 | 用户可见数据失去原始细分状态与可解释的暂停/时段原因；保守的归一化状态仍用于安全判断，不应被放宽。 |
| token-list 包级 `timestamp`；price endpoint 的逐资产 `tokenPriceUpdatedAt` | `listSnapshot()` 将包级时间存为响应时间；`tokenPriceSnapshots()` 从 `/price` 读取逐资产时间，并与响应时间分开。当前 token-list 类型虽可选地接收 `tokenPriceUpdatedAt`，但渲染版文档没有承诺该字段存在于 token-list 项。 | 保持两种时间的语义分离；可选读取不能表述为文档保证，也不能推导出数据新鲜度 SLA。 |

对应的源码核验点是 `RwaSearchResponse`、`RwaTokenResponse`、`TokenizedStocksService.search()`、`TokenizedStocksService.listSnapshot()`、`normalizeMarketStatus()`、`normalizeMarketContext()`、`StockAsset`、`TokenizedStockListing` 和 `MarketContext`。`test:phase27-contract` 保留来源契约与 Phase 27 缺口的审计基线；它不将旧快照误报为当前实现。

## Phase 28 候选实现状态

本地合成夹具现验证 `assetType` 从搜索和目录服务进入领域/SDK对象；未识别的数字类型保留原值。市场上下文并列保存精确的上游 `providerMarketStatus` 与保守归一化 `marketStatus`，并传递 `openState`、原因码/说明和下一次开/收市时间。Agent 英文/中文文本、结构化对象、比较结果和 MCP 原生研究卡均有对应断言；原生卡对详情采用渐进披露，并对上游文本做 HTML 转义。Agent Markdown 会压平成单行并转义控制字符；时间戳经运行时校验。上游 `pause` 仍归一化为 `closed` 并阻止执行；未知状态仍显示为 `unknown`，而且现被设为阻断级安全检查，由 SDK/MCP 计划注册门禁强制要求。

这些是本地合成服务测试结果，不代表重新访问 Binance、验证实时返回或证明目录完整性。阶段的最终批准状态与置信度见 `records/jev-shadow.jsonl` 中 Phase 28 的最后一条门禁记录；当前尚未以通过门禁为交付结论。

## 本阶段证据边界

Phase 27 执行的检查仅为 `npm run typecheck`、`npm run test:phase27-contract`、`npm run test:phase26-limitations`、`npm run test:core-product-phase-plan` 和 `npm run test:jev-shadow`；它们分别是 TypeScript 类型检查、本地合成服务/记录断言、路线图核对和阶段门状态机回归。没有调用 Binance endpoint、重放 Phase 26 查询、读取或保存新原始响应、使用 Binance provider credential、写入外部系统或 push 仓库。Jev gate 使用独立配置的审查认证；密钥不进入 Jev 证据，实际记录只包含被审查的目标、检查结果和经过审查的摘要。该说明记录本次实际工作范围，不把“未观察到请求”冒充成供应商行为证据。

## 对后续实现的限定

Phase 28 只处理 Ariadne 自己丢弃的、官方字段明确支持的信息：表示类型与可用的详细市场状态/原因字段。未知枚举继续保留为未知，交易安全继续 fail-closed。不会尝试“补齐”上游目录、虚构总数、把 `tickerCount` 当作 token 行数，或在没有新授权时重跑市场接口。

本审查仅使用 Binance 官方文档页面和当前仓库代码；没有发起任何 Binance API 请求，也没有记录原始响应、凭证或用户数据。
