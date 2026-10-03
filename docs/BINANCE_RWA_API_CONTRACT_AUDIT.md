# Binance Web3 RWA API 契约审查

审查日期：2026-10-03
官方来源：[Binance Web3 API — RWA Data](https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data)
结构化记录：[research/data/binance-rwa-contract.json](../research/data/binance-rwa-contract.json)
有界目录观测：[research/data/provider-catalog-observation.json](../research/data/provider-catalog-observation.json)

## 审查结论

官方文档中的几个“数量”并非可以直接互换：平台 `tickerCount` 表示底层资产数量；`chainDistribution.tokenCount` 表示某条链上的 RWA token 数量，同一底层资产部署到不同链会分别计数。2026-10-03 的一次有界 BSC 观测中，平台元数据的 BSC `tokenCount` 合计为 545，目录接口返回 488 个按“链 ID + 小写合约地址”去重的表示，算术差为 57。

这 57 的原因没有查明。官方渲染版目录文档没有列出分页参数、总数或续页标记，但下载 OpenAPI schema 的链接在审查时超时；因此不能把差额归因于分页，也不能断言运行时不存在未公开的分页或筛选语义。该观测只说明一次请求结果，不证明目录完整，也不代表市场上只有或缺少某个确定数量的资产。

## 官方文档明确描述的契约

| 接口 | 文档中明确的字段或行为 | 不能据此推断的内容 |
| --- | --- | --- |
| `/api/v1/dex/market/rwa/platforms` | `tickerCount` 为底层资产数；`chainDistribution.tokenCount` 为链上 RWA token 数；包含响应级时间戳 | 两种数量在筛选口径、更新时间和完整性上完全一致 |
| `/api/v1/dex/market/rwa/tokens` | 可选 `binanceChainId`、`platformId`、`tabId`；`assetType` 区分 Stock、Pre-IPO、ETF；市场状态及原因/开收市字段 | 未列出的分页机制一定不存在；返回值是全量目录 |
| `/api/v1/dex/market/rwa/search` | 以 `keyword` 搜索，可选 `platformId`；结果可跨平台、跨链 | 文档列出了链 ID 搜索参数；任意查询都会返回完整集合 |
| `/api/v1/dex/market/rwa/price` | 可按链和合约地址取价；逐资产 `tokenPriceUpdatedAt` 与响应级时间戳分开 | 有时间戳就代表数据满足某个新鲜度 SLA |

目录文档没有把逐 token 的 `tokenPriceUpdatedAt` 或 `liquidity` 列为 token-list 项字段。一次 BSC 目录观测中，488 行没有逐项更新时间或流动性字段，442 行有可识别的市场状态，46 行没有可识别状态。两个 `tabId` 查询返回相同身份集合，也不足以证明筛选器无效。

## Ariadne 对数据的处理

- 搜索和目录结果保留整数 `assetType`；未识别的整数仍作为未知值保留，不会被改标为普通股票。
- 详细上游市场状态及 `openState`、原因和下次开/收市时间与内部保守归一化状态并存，便于用户理解，同时不放宽交易安全检查。
- 响应级与逐资产时间戳分开记录来源。无效或缺失时间不会被补造；时间戳存在也不会被表述成新鲜度保证。
- `pause`、未知状态、无效时间或互相矛盾的状态标记不会被当作“市场已安全开放”。
- SDK/MCP 对目录查询明确标记为“上游返回结果”，而非“完整市场目录”。

这些字段路径有本地合成服务测试覆盖，测试验证从响应归一化到领域对象、Agent 文本、结构化结果和 MCP App 研究视图的保真。它验证 Ariadne 对契约字段的处理，不等于重放真实 API 或证明上游目录完整。

## 复核方式与证据边界

```bash
npm run test:provider-contract
npm run test:provider-catalog-limitations
npm run test:provider-data-fidelity
```

本页的契约复核依据 Binance 官方渲染文档和本地源码；没有在本次文档复核中重发供应商请求。目录观测文件记录了单次 6 个只读 GET 请求的范围和汇总数据，不包含原始响应、合约地址或凭证。若要重新计算汇总、厘清供应商差额或验证分页行为，需要另行进行有边界的只读观察；当前记录不替代该证据。
