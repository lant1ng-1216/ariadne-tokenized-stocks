# Ariadne 技术研究与验证报告

更新日期：2026-10-09
研究范围：Ariadne TypeScript SDK、MCP 服务、Agent 输出、MCP App 研究视图、API 数据保真与执行安全边界。

## 摘要

Ariadne 将 Binance Web3 RWA 与相关市场能力封装为可复用的 TypeScript SDK，并通过 MCP 提供给现有 AI Agent。系统以发行方感知的资产身份、来源可追溯的市场上下文和显式数据缺口为基础；在 MCP 宿主支持时，还能将研究结果呈现为只读的原生 MCP App 卡片。

本报告综合代码路径审查、本地合成测试、隔离消费者测试、实验记录审计、只读供应商观测和一次创始人真实资金 BSC 购买。证据支持：核心 SDK/MCP 研究链路已实现并有测试；资产表示、状态和来源字段可以保留到 Agent 与 MCP App 输出；模拟及标准 BSC EVM 防护路径有离线测试；2026-10-09 的 bStocks NVDAB 单笔购买已由 BSC 回执、Transfer 日志和 owner 钱包显示共同核对。证据不支持：上游目录完整、行情达到某个 SLA、任意 Agent 宿主都能展示相同 UI、Ondo 的真实资金购买，或所有资产和钱包环境都具有相同可靠性。

## 2026-10-03 仓库整理验收记录

公开仓库现有 178 个索引路径，核心代码保留在 domain、services、MCP 和 presentation 四个区域；范围测试逐项核对 27 个必需产品/研究文件、21 个本地 Markdown 链接及 11 个结构化研究文件。站点实现和内部阶段流程材料不属于公开产品树。SDK/MCP 类型检查、构建、隔离消费者安装、MCP App 渲染、离线执行安全和实验审计共 12 项验收检查全部通过。最终 Jev 评审置信度为 **0.89**（门槛 **0.85**），仓库范围、独立消费、供应商披露和研究数据卫生标准均通过。

结构化研究数据检查未发现钱包或凭证字段或 Bearer 值；目录观测记录注明未包含原始供应商载荷和凭证。公开配置模板中的 API key/secret 留空，安全演练的地址字段仅为零地址测试夹具。2026-10-03 的离线执行演练为 0 次广播且未使用真实钱包；2026-10-09 的单独 owner 授权 pilot 在本报告后文独立记录。仓库验收本身不代表线上部署、npm 发布或跨路线真实交易可靠性。

## 系统结构

```text
Agent ── MCP ─────┐
                  ├──> Ariadne 领域模型与安全检查 ──> Binance Web3 API
开发者应用 ─ SDK ─┘                     │
                                       ├──> 文本与结构化研究结果
                                       ├──> MCP App 只读研究视图
                                       └──> 外部钱包签名/交易边界
```

SDK 与 MCP 共用资产解析、行情归一化和计划安全逻辑。Agent 负责自然语言理解和宿主侧工具选择；Ariadne 返回明确的发行方、链、合约、来源、警告和下一步状态。MCP App 是同一份 MCP 结果的 UI 呈现方式，不是独立的数据后端。SDK 接入方可以在自己的应用中构建适合自身用户的界面。

标准执行路径遵循：

```text
读取 → 计划 → 模拟 → 明确确认 → 外部签名 → 验签与余额/Gas 检查 → 单次广播尝试
```

Ariadne 不接收或保存私钥。MCP/SDK 中的确认状态推进本身不构成签名或广播授权。底层通用回调与原始广播方法仍属于集成方自担校验责任的高级接口。

## 研究方法与证据

### 可复现的开发实验

`research/experiments/` 保存只读请求、结果快照、安全结果、数据字典及实验矩阵。当前审计摘要记录 105 条请求、40 个结果快照和 5 条安全结果；105 个请求 ID 唯一，记录中的广播数为 0，覆盖缺口与审计失败列表为空。场景覆盖资产解析、行情上下文、标准/RFQ 报价准备、allowance 读取、模拟预览、DeFi 错误处理及重试策略。

这些是受控开发实验，不是生产流量、市场份额、线上可靠性或用户行为统计。复核命令：

```bash
npm run audit:experiments
```

### 上游目录与契约观察

2026-10-03 的有界观测执行了 6 个串行只读 GET 请求，未自动重试。平台元数据中 BSC `chainDistribution.tokenCount` 合计为 545，目录结果按链 ID 与合约地址去重后为 488，差额 57 原因未明。一次观测中 442 条返回记录有可识别市场状态，46 条没有；目录行没有逐项行情更新时间或流动性字段。两个 sector 查询返回了相同身份集合，但这不能证明过滤参数无效。

观测没有保存原始供应商响应、合约地址或凭证，因此不能仅凭汇总文件独立重算每条记录。Binance 渲染版文档没有说明目录分页或总数契约；OpenAPI 下载链接当时超时。故目录是否完整、差额的原因和过滤器运行时语义仍属未知。

行情价格接口提供逐资产时间戳，但两条 NVDA 样本的观测年龄只有一次读数，不能推出数据新鲜度 SLA 或可接受的最大行情延迟。完整字段映射和边界见[供应商契约审查](BINANCE_RWA_API_CONTRACT_AUDIT.md)。

### 延迟样本

2026-09-20 的历史三次测量记录为：SDK 搜索 259–621 ms、行情上下文 841–944 ms；MCP 搜索 262–571 ms、行情上下文 405–836 ms，MCP 建连 363 ms。测量未包含 Agent 推理和最终回答渲染，也不是当前性能承诺或生产 SLO。原始重复值见 [`research/data/latency-decomposition.json`](../research/data/latency-decomposition.json)。

### SDK 与 MCP 数据保真验证

本地合成供应商响应验证了以下路径：

- `assetType` 从搜索/目录输入保留到 SDK 领域对象；未知整数不被伪装为已知类型。
- 上游市场状态、开市标记、原因码/文本、下一次开收市时间、价格、参考价、价差和来源时间保留到 Agent 与 MCP 输出。
- 结构化内容与 MCP App 研究视图展示同一表示身份和同一批数据；供应商文本在 HTML/Markdown 呈现时受到转义或隔离。
- 无效时间不渲染为日期；`pause`、未知状态及互相矛盾的市场字段不能被降格成“开放”。

这些是本地确定性合成测试，证明 Ariadne 的映射和保护行为，不证明上游始终返回这些字段。

### 执行安全验证

离线 `TESTB` 演练覆盖报价与余额/授权检查、计划注册、模拟、确认、本地测试签名和广播前校验，并验证资金不足、计划变更/过期、模拟失败、错误签名者、Gas 超限、BNB 不足、输入余额变化和重放等拒绝路径。预期输出是 0 次广播请求且未使用真实钱包。该演练不代表真实链上交易或结算。

标准 BSC EVM SDK/MCP 路径还对外部签名内容、计划一致性、Gas 上限、当前余额、allowance 和每计划单次广播尝试进行保护。2026-10-09 已验证一笔 bStocks NVDAB 标准 BSC EVM 购买；RFQ/Ondo 结算、跨资产可靠性和 Agent 自动登记/报告仍未验证。

### 2026-10-05 — 真实资金交易闭环审查

执行路径代码覆盖 `createActionPlan` 报价和无签名交易构造、计划模拟、MCP 表单确认、SDK/MCP 外部签名载荷校验、标准交易广播边界、广播订单状态及钱包持仓读取。验证层级需要分开：实验记录中 bStocks 标准报价 10 次、Ondo RFQ 报价 10 次均为 HTTP 200 / business code 0，使用零地址且所有广播标记为 `false`；`test:execution-dry-run`、`test:guarded-sdk-executor` 与 `test:mcp-human-confirmation` 是离线合成或 mock 执行，广播数为 0。因而这些证据没有覆盖一笔真实资金交易。

代码和脚本复核还发现三个闭环缺口：第一，MCP 买入工具要求调用者直接给出输入币合约地址与 `amountDecimals`，没有从自然语言代币名解析并核验链上 token metadata；第二，allowance 不足会令计划失败，approval action 虽可单独构造，但没有集成到 approve→外部签名→重新读 allowance→重新报价的计划状态机；第三，广播状态、交易详情和钱包余额接口分散存在，尚无真实交易最终确认及交易前后稳定币/股票代币 delta 对账。外部钱包签名仍由 SDK 集成应用或 MCP 调用者提供，MCP 不内置钱包连接器。

因此，当前产品代码并非只有研究展示：报价、计划和执行保护层已经存在。但目前实际体验及证据只证明 Live 只读研究/报价观察，以及合成计划的执行状态机；一条由真实用户钱包完成、可核对成交与余额变化的端到端交易尚未验证。分阶段证据及 `test:mcp` 断言边界见 [`PRODUCT_EXPERIENCE_REPORT.md`](PRODUCT_EXPERIENCE_REPORT.md)。

## 2026-10-05 V1 readiness 复核

当前复核按工作流中的十项配置检查执行：`typecheck`、`build`、Live `test:mcp`、Live `test:mcp-natural-language`、`test:demo-mode`、两项 MCP 确认夹具、`test:cleanroom`、`test:distribution` 和 `test:repository-scope`。这些命令退出结果通过，但其含义仅限各自断言；市场状态修正后，十项配置检查均已重新运行并通过。Live MCP 集成列出 18 个工具；发现和比较断言成功，未注册广播在本地 registry 被拒绝。修正前的 2026-10-05 Live ActionPlan 返回 `failed`，原因包括市场类别 Unknown、零地址余额不足和 allowance 不足。经官方字段语义复核，Binance 将 `openState` 定义为标的市场当前是否可交易，并将 `marketStatus` 定义为单独的状态类别；因此当时的 Unknown 阻断是本地规则误把类别未知当成不可交易。代码现已修正：未知类别加明确 `openState: true` 通过可交易性检查但保留 Unknown 警告；缺失/false、关闭或冲突仍阻断。该行为通过本地领域、字段保真、双语展示和 MCP UI 回归测试。修正后 Live `test:mcp` 于 2026-10-05 08:15 UTC 重跑，直接验证当前 bStocks 返回 `marketStatus=unknown`、`openState=true`，市场状态检查通过且 severity 为 warning；ActionPlan 仍 `failed`，剩余阻断为零地址输入余额不足和 allowance 不足，没有到 `awaiting_confirmation`。因此 Live 数据与状态判断现已验证，真实钱包计划仍未验证。旧记录的零地址余额/allowance 不代表真实钱包；测试仍允许接口层返回 `failed`，所以 smoke check 本身通过不表示交易计划通过。计划模拟输入是未注册占位计划并正确拒绝；另一项独立模拟是零值占位交易，不验证真实 ActionPlan 的模拟成功。钱包暴露和订单状态接口同样使用零地址。自然语言 Live 测试返回两种 NVDA 表示，状态为 warning，`sideEffects=none`，英文/中文旅程和只读 MCP App 资源链接断言通过。

本次 readiness gate 的配置检查和验收标准均被列为通过，但 Jev 结果是 `passed_with_deferred_items`、置信度 **0.80**；门禁给出的原因是置信度低于配置阈值，阶段状态仍为 `pause`，没有切换至 `funded-closure-engineering`。不应把 readiness gate 的暂停误读成资金闭环已通过或某个产品测试失败；真实资金交易与成交对账仍是明确的后续工程阶段。

## 2026-10-07 钱包资金决策边界更新

上文 2026-10-05 中“零地址余额不足导致计划失败”是当时实现与当次零地址观察的历史记录，不是当前 Ariadne 的购买资格规则。当前工程实现不读取余额来决定是否准备计划、模拟后确认或打开钱包；ERC-20 allowance 与交易费上限仍是各自独立的授权/交易约束。只包含余额或网络费不足的提供方模拟失败保留为失败警告，继续交由钱包判断；其他模拟失败仍阻断。此改动的零余额及警告路径由本地确定性测试覆盖。2026-10-07 重新运行的 Live BSC RPC 探测在 TLS 连接阶段被重置，因此本轮没有新的 Live 链上计划模拟证据；没有使用 owner 钱包或发起签名/广播。

Demo 结果明确是七个 ticker 的固定合成数据。确认与签名安全测试使用本地 synthetic plan、回环 provider 和确定性测试密钥；它们检查显式 accept/decline/cancel、计划绑定、签名载荷比对、余额/Gas 防护、重放拒绝，不调用真实钱包签名服务或链广播端点。cleanroom 通过本地 tarball 安装、运行时/声明导入、双发行方身份和选定 bStocks 行情上下文验证；SDK 示例不再默认取第一个发行方，空白查询现在本地 fail-fast。

这些通过结果支持受测接口和路径在当前夹具/观测条件下工作，不代表目录完整、实时行情稳定、所有 Agent 宿主行为一致、资金交易成功或链上结算完成。真实签名/广播、RFQ 结算、自动工具路由、跨宿主 UI/屏幕阅读器、npm 发布和 Hosted MCP 生产部署仍未验证或未获授权。Live 结果只记录不含凭证的摘要；不将原始供应商载荷写入报告。

## 验证入口

从仓库根目录可运行：

```bash
npm ci
npm run typecheck
npm run test:domain
npm run test:provider-contract
npm run test:provider-catalog-limitations
npm run test:provider-data-fidelity
npm run test:mcp-app-ui
npm run test:execution-dry-run
npm run test:distribution
npm run test:cleanroom
npm run audit:experiments
```

`test:mcp-natural-language` 和部分 `check:api` / `probe:*` 命令需要配置自己的供应商凭证并可能访问真实只读 API；它们不是无网络的本地测试。不要把 API 凭证、钱包信息或原始敏感日志加入研究记录。

## 结论

当前最有力的证据包括 SDK/MCP 代码路径、确定性合成测试、MCP App 资源渲染、数据缺口表达、计划确认边界、离线执行拒绝路径，以及一笔 owner 授权的 bStocks NVDAB 主网购买。外部供应商目录完整性、行情 SLA、跨宿主视觉一致性、Ondo/RFQ 结算与跨资产可靠性仍必须作为未验证事项陈述，不能由本地绿色测试或单笔成功交易替代。

## 2026-10-09 — 创始人真实资金 BSC 购买验证

产品 owner 使用自己的 BNB Smart Chain 钱包，在主网上按 Ariadne 计划用 **7 USDT** 购买 bStocks `NVDAB`。MetaMask 从外部购买复核页主动弹出交易确认；owner 在钱包中确认后，主购买交易 `0xfecb1e0eaa526d9dbc845c7c964307200d8fa38e47e4dd5e34aa8c89c95c7cd6` 于区块 `126480949` 成功执行。

BSC JSON-RPC 回执与 Transfer 日志核对到：输入支出 `7 USDT`，输出到账 `0.029960179248028382 NVDAB`，高于计划复核的最低到账 `0.029529313883297983 NVDAB`；交易使用 `785208` gas，effective gas price 为 `60000000 wei`，链上网络费为 `0.00004711248 BNB`。交易目标是 `0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5`，输出代币合约是 `0x02fca66c1d1afb4e2a7884261eb00f63598a7436`。

MetaMask Gas Station 同时产生了辅助交易 `0x32222508cf321b61727b569e16ad4077be550890e943910e6ca95f6ff0b41764`。该交易用于钱包的 gas 处理，**不是** 7 USDT 换取 NVDAB 的购买主体；产品中的链上查看入口必须指向上述 `0xfecb…7cd6` 主购买交易。

owner 随后在 MetaMask 中导入 NVDAB，钱包显示约 `0.0300 NVDAB` 与当时约 `US$6.95` 的估值。结构化事实、哈希和证据边界见 [`founder-funded-bsc-purchase-2026-10-09.json`](../records/ariadne-workflow/evidence/founder-funded-bsc-purchase-2026-10-09.json)。本次 owner 指定采用的两张截图为：[MetaMask 资产显示](../records/ariadne-workflow/evidence/media/2026-10-09-founder-funded-nvdab-metamask.png)和 [BscScan 主购买交易](../records/ariadne-workflow/evidence/media/2026-10-09-founder-funded-nvdab-bscscan.png)。

证据边界：这是一笔真实、owner 授权的创始人资金测试，验证当前受测的 **bStocks NVDAB 标准 BSC EVM 路线**。它不证明所有股票、发行方、钱包或宿主都同样可靠。Ariadne 当前在 BSC 研究中支持发现和比较 bStocks 与 Ondo；本记录没有 Ondo 的真实资金购买证据。钱包广播后的后台登记、链上核验与去重终局消息链路已在本地实现和验证，但仍需在下一次 owner 真实购买中验证宿主主动消息闭环。
# 2026-10-09 BSC catalog execution audit

Ariadne ran a read-only, non-broadcast audit over every representation returned by the current Binance Web3 BSC directory. The measured directory contained 488 representations: 46 bStocks and 442 Ondo. Research identity and timestamped price coverage passed for all 488 after correcting Ariadne's RWA price batching from 100 addresses to the provider-compatible 50-address boundary.

At the measurement time, all 46 bStocks representations returned one quote and one unsigned EVM transaction. Of 442 Ondo representations, 239 returned one quote and one unsigned EVM transaction; 203 were unavailable because Binance Web3 reported a non-trading session, insufficient liquidity, or a malformed upstream response after bounded retries. No representation failed because of an Ariadne issuer, ticker, Apple, or NVIDIA special case. These results prove catalog-wide adapter coverage at the measured time; they do not guarantee that every directory item is executable at every future moment.

The normalized evidence is stored in `records/ariadne-workflow/catalog-audits/bsc-business-coverage-latest.json`. The audit uses a non-funded address, does not request a wallet, and performs no signature or broadcast.

The external purchase page now persists failures that occur after a plan link opens but before a transaction is submitted. Quote-refresh, plan-boundary, wallet-discovery and wallet-preflight failures become terminal, deduplicated Agent reports containing the last completed stage, reason, nullable transaction hash, funds-change status and next action. A null transaction hash is reported as not submitted and must never be described as a purchase.

### Current-directory identity reconciliation

A subsequent Apple plan probe exposed an upstream identity drift: Binance Web3 search still returned the former bStocks `AAPLB` contract `0x431a3bee82e2ca41e49895cbece5bb0f76a89b7a`, while the current BSC directory no longer contained that exact chain/issuer/contract tuple. The current directory contained the Ondo `AAPLon` representation at `0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4`.

Ariadne now intersects provider search matches with the current directory before MCP research, resolution, comparison or plan preparation. A search-only identity is retained as a stale diagnostic but cannot reach market-context lookup, quoting, unsigned transaction construction, purchase-plan creation or wallet-page creation. Valid matches use the directory row as the metadata source. Deterministic coverage proves rejection of the stale bStocks Apple identity and retention of current Ondo Apple; the live probe was read-only and made no wallet request, signature or broadcast.
