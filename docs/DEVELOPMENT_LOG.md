# Ariadne 产品开发记录

本记录只描述 Ariadne SDK/MCP 产品本身的能力演进、验证范围和仍未证实的边界。开发者体验评估见 [`DEVELOPER_EXPERIENCE_REPORT.md`](DEVELOPER_EXPERIENCE_REPORT.md)；研究数据与可复现命令见 [`research/`](../research/)。

## 2026-09 — SDK 与上游 API 基础

- 建立 Binance Web3 API 客户端与 TypeScript SDK，覆盖 HMAC 请求签名、超时、重试、错误归类、请求观测和领域数据归一化。
- 完成 RWA 搜索、目录、行情、钱包/组合、交易准备、交易模拟及 DeFi 发现等模块的接入。
- 记录了 API 调用和延迟的开发样本，并对实验记录建立可重复的完整性审计；这些样本是受控开发证据，不是生产 SLA。

## 2026-09 — 发行方感知的研究与 MCP 接入

- 通过合约、平台和链身份保留同一 ticker 的不同代币化表示，并增加比较、行情上下文、来源和缺失数据提示。
- 将 SDK 能力暴露为 MCP 工具，为 Agent 提供高层研究工作流及底层可组合工具。
- 为输出增加稳定的结构化结果、状态、下一步和副作用信息，避免把上游错误伪装成空结果。

## 2026-09 — MCP App 研究卡与 Agent 输出

- 增加与 MCP 研究工具绑定的只读 MCP App 视图，使发行方身份、状态、数据来源和警告能以产品 UI 呈现。
- 对文本、结构化内容和本地 MCP App 渲染建立一致性测试，并覆盖中文/英文研究表达、未知值和恶意上游文本边界。
- 对工具自动选择和第三方宿主 UI 明确保留宿主差异：本地测试不能推导出任意 Agent 客户端的相同表现。

## 2026-09 至 2026-10 — 计划与执行安全

- 将查询/研究与 ActionPlan、模拟、明确确认、外部签名和广播区分为独立阶段。
- 对标准 BSC EVM 交易路径增加计划绑定、外部签名校验、Gas 预算、余额/allowance 复查和重放保护，并以离线合成测试覆盖拒绝路径。
- SDK 包可本地构建、打包并通过隔离消费者测试；包尚未发布至 npm。真实资金广播、RFQ 结算及交易后对账没有被这些本地测试证明。

## 2026-10 — 上游字段保真与目录不确定性

- 根据 Binance 官方渲染文档核对 RWA 字段，并通过本地合成响应验证资产类型、详细市场状态、原因字段及开/收市时间沿 SDK、Agent 输出和 MCP App 的传播。
- 一次有界目录观测记录了 BSC 平台统计 545 与目录返回 488 个唯一表示之间未解释的 57 条差异，以及筛选、状态覆盖、逐项更新时间、流动性和行情新鲜度方面的未知项。
- 这些结论被保留为有界观察，不被转化为目录完整性或服务质量保证。

## 2026-10 — 公开仓库整理与验收

- 将公开仓库收敛到 Ariadne SDK/MCP 核心、用户文档、示例、研究资料和可复现测试；移除了独立站点实现及内部阶段计划、运行器和本地记录。研究报告与产品限制说明继续保留。
- 最终验收通过 12 项检查：类型检查、构建、仓库范围与研究数据卫生、隔离消费者安装、Provider 契约/数据保真、MCP App、离线执行演练、分发、新手引导和实验审计。
- Jev 最终评审置信度为 **0.89**，高于 **0.85** 门槛；公开仓库范围、SDK/MCP 独立使用、Provider 披露、研究数据卫生四项标准均通过。
- 未解决的产品边界没有因仓库整理而改变：供应商目录完整性、筛选语义、行情新鲜度 SLA、跨 Agent 宿主 UI 一致性和真实资金结算仍未被本地检查证明，见产品限制说明。

## 当前验证入口

核心本地检查包括 `typecheck`、领域与数据保真测试、MCP App 渲染、离线执行演练、SDK 分发和隔离消费者测试，以及 `audit:experiments`。需要凭证或访问真实供应商的检查应与本地合成检查分开报告，并说明实际请求范围。

## 2026-10-05 — V1 readiness 与首次使用修复

- 修复 SDK 首次使用时静默选择 `assets[0]` 的问题：示例现在列出全部 issuer 身份，并要求传入精确 `assetId` 才请求行情上下文。
- `TokenizedStocksService.search()` 现在先 trim 输入；空白查询以稳定 TypeError 在本地拒绝。隔离消费者确认空串和制表符/换行输入均不会发出 provider 请求。
- cleanroom 现在验证 Ondo 与 bStocks 两个 NVDA 表示、明确选择后的市场上下文、运行时代码及类型声明。SDK 包仍是本地 tarball；这不是 npm 发布证据。
- 最终 Live MCP 复核列出 18 个工具，覆盖研究/读取响应和本地未注册广播拒绝；测试没有证明 Live ActionPlan 可执行或真实计划模拟通过。自然语言 Live 测试覆盖中英文与 2 个 NVDA 表示。Demo、host confirmation、distribution、repository-scope、typecheck 和 build 结果与 Live 证据分开标注。
- 实际产品限制仍包括 provider 目录/新鲜度未知、第三方宿主自动路由和渲染不统一、真实资金广播与链上结算未验证、RFQ/native-input/multi-action 限制、无 npm 发布及无生产 Hosted MCP。没有使用总体完成百分比，也没有将本地模拟写作真实交易。

## 2026-10-05 — 真实资金闭环专项审查

- 用户明确指出真实资金买入、成交确认和成交后余额核对是证明产品可行性的必要环节。
- 代码层：标准 BSC EVM 报价/计划、余额与 allowance 检查、计划模拟、MCP 人工确认、外部签名验证、单次广播边界、订单状态与钱包持仓读取均有实现；SDK 不含钱包签名 UI，MCP 也不内置钱包连接器。
- 实测层：实验数据含 10 条 bStocks 标准报价及 10 条 Ondo RFQ 报价成功记录，均基于零地址且没有广播。Live MCP 计划测试实际返回 `failed`，阻断原因为市场状态 Unknown、零地址输入币余额不足及 ERC-20 allowance 不足；原输出把“响应已收到”误标为 `planSucceeded`，现改为输出实际状态和阻断原因。计划模拟/确认、签名与广播安全证据来自本地合成和 mock 测试，网络广播为 0。
- 缺口：输入币合约和 decimals 由调用者提供；allowance 不足会阻断，approval action 未编入可执行的多步授权流程；真实外部钱包签名与交易广播没有验证；订单最终状态和交易前后稳定币/股票代币余额没有自动关联核对。
- 当前结论：真实研究/展示和报价端点有证据，完整真实资金闭环没有证据。下一开发阶段应只锁定一条明确 issuer、BSC 标准 EVM、单一稳定币输入的购买主路，先补完地址/精度校验、授权、钱包签名交互和成交对账的安全实现及本地回归；真实钱包签名/广播须另有具体钱包、网络、金额和操作授权。

## 2026-10-05 — bStocks 市场状态语义修正

- 原因：Live 记录中的 bStocks `marketStatus` 类别为未知，但同时有 `openState: true`。Binance 文档将 `openState` 定义为标的市场当前是否可交易，`marketStatus` 是另一个类别枚举；旧安全判断把“类别未知”直接当成“不可交易”，忽略了明确的可交易信号，导致该检查错误阻断。来源和字段区别见 [`BINANCE_RWA_API_CONTRACT_AUDIT.md`](BINANCE_RWA_API_CONTRACT_AUDIT.md)。
- 修正：安全检查现在只在未知类别缺少 `openState: true` 时阻断；显式 `true` 通过可交易性检查但仍显示 Unknown 并保留警告。未知类别缺字段、`false`、明确关闭或状态冲突仍阻断。未改变交易确认、签名或广播边界。
- 验证：本次修正后，V1 配置的十项检查全部重跑并通过：`typecheck`、`build`、Live `test:mcp`、Live `test:mcp-natural-language`、`test:demo-mode`、两项 MCP 确认夹具、`test:cleanroom`、`test:distribution` 和 `test:repository-scope`；另外 `test:domain`、`test:provider-data-fidelity`、`test:presentation`、`test:mcp-app-ui` 与 `git diff --check` 通过。独立只读复核没有发现严重问题，建议补测对称的关闭/开放冲突；补上 `closed + openState:true` 断言后，本地相关检查再次通过。
- Live 结果：2026-10-05 08:15 UTC，bStocks 返回类别 `unknown` 与 `openState:true`；计划 `market_status` 检查 `passed=true`、`severity=warning`。计划仍为 `failed`，只剩零地址余额不足和 allowance 不足，未到 `awaiting_confirmation`。这验证了 Live 字段路径和本次规则，不证明真实钱包可执行或资金闭环。
- 限制：测试使用零地址和零值模拟，不含有效用户签名或链上广播。真实钱包资金、授权、签名、成交确认和交易后余额对账仍未验证。

## 2026-10-07 — 钱包资金由钱包判断

- 产品边界修正：Ariadne 不因用户当前 USDT 或原生币余额不足而隐藏购买计划或阻止打开钱包。计划准备不读取余额；钱包接收精确请求后自行判断能否提交。
- 交易权限仍单独处理：ERC-20 allowance 是 spender 对用户代币的授权，不等于钱包是否有钱；不足时显示单独的精确授权步骤。Gas 上限约束交易内容，不检查钱包当前能否支付。
- 模拟语义：仅余额/网络费不足的提供方错误以 `wallet_review` 警告继续到钱包，模拟仍标记失败；其他模拟失败仍阻断。成交后余额只用于最终结算证明。
- 回归：当前阶段的 11 项配置检查通过；额外 `test:domain`、`test:gas-safety`、`test:plan-registry` 与 `test:mcp-app-ui` 通过。确定性夹具验证零余额计划/钱包交接及授权余额类模拟警告。实时探测在 BSC RPC TLS 连接处被重置，未得到新 Live 报价/模拟；没有真实钱包、签名或广播。

## 2026-10-07 — 资金充足性不属于 Ariadne 的闸门

- 产品流程明确为：用户提出购买意图后，Ariadne 负责报价、核验资产与交易内容、整理计划并交给用户钱包；Ariadne 不用 USDT/BNB 余额决定是否创建计划、展示授权或打开钱包。钱包本身决定能否提交。ERC-20 allowance 是用户授权给 spender 的权限，属于单独的签名步骤；交易 gas 上限约束的是请求内容，也不代表 Ariadne 检查钱包余额。
- 已补强回归：`test:transaction-closure` 断言购买计划准备时余额读取调用为 0；另验证 provider 的 gas-limit 与 gas-price 估算均失败时，只能回退到精确 allowance builder 自带的 gas 字段，仍不读取余额。`test:mcp-transaction-closure` 验证模拟只报告资金不足时，交易请求仍可进入钱包页；零 USDT / 零原生币夹具也能到达 wallet handoff。`test:guarded-sdk-executor` 输出 `walletFundsAndGasBalancePrechecks=false`。
- 实时只读探测使用合成地址完成了 Binance Web3 报价、单一路由交易构造与 gas 估算；提供方模拟返回 `BEP20: transfer amount exceeds balance`，本轮分类为 `walletFundsOnlyFailure=true`，保持 `simulation.success=false` 并提示交给钱包判断。该结果仅说明合成地址的模拟无法覆盖资金条件；不代表任何真实钱包余额，也不代表模拟通过。全程没有 owner 钱包、签名或广播。
- 本轮重新运行 funded-closure-engineering 的 11 项配置检查，全部退出码为 0；`test:domain`、`test:gas-safety`、`test:plan-registry`、`test:mcp-app-ui` 和 `git diff --check` 也通过。实际 Codex 宿主弹窗、部署后的 HTTPS 页、真实签名、广播和结算仍未验证。

## 2026-10-07 — 购买计划不再被缺失授权挡住

- 复核发现 BSC 专用计划还有一个漏口：当 USDT allowance 为零时，swap gas-limit 估算会因 `transfer amount exceeds allowance` 失败，旧处理会清空已经生成的购买计划。现在在单独授权完成前不估算这笔尚不能执行的 swap；保留购买计划，标记费用“授权完成后重新报价时估算”，然后提供独立的精确 USDT 授权步骤。
- 授权交易的 gas-limit 接口失败时，如果精确授权构造接口已经给出 gas limit/price，就用该交易本身的字段计算并展示费用，不检查钱包余额。授权后刷新时，如果只读余额接口暂不可用，会报告这项信息缺口，但仍按已确认的 allowance 继续生成新计划。
- 验证：`typecheck`、`test:transaction-closure`、`test:mcp-transaction-closure`、`test:mcp-human-confirmation`、`test:plan-registry` 通过。新增夹具证明：零 allowance 不触发 swap gas-limit 请求且仍返回计划；授权交易 fee estimate 可用构造器返回值回退；余额读取失败不阻止授权后的新计划。夹具不使用真实钱包，未签名、广播或花费资金。

## 2026-10-07 — funded-closure-engineering Jev 闸门复核

- 自审：本阶段 5/5 acceptance criteria 与 11/11 配置检查通过。另有 `test:domain`、`test:gas-safety`、`test:plan-registry`、`test:mcp-app-ui` 与 `git diff --check` 通过。
- 真实在线 Jev：本阶段状态 `passed_with_deferred_items`（状态维度 0.91）；下一步判断置信度 0.63，低于 0.85 门槛，`ask_user` 概率 0.72；风险维度 0.98（high），结构化不确定项为 `next_phase_context`。因此 workflow 保持在 `funded-closure-engineering`，转阶段暂停。
- 具体含义：Jev 没有说本阶段实现失败，也没有把资金余额当作拦截理由。它指出下一配置阶段 `funded-closure-live-pilot` 的目标是一次真实 BSC 买入；该阶段需要精确到钱包、资产、金额、滑点、Gas 上限等信息的逐笔授权。这个阶段授权边界尚未满足，所以不能自动进入真实钱包请求阶段。状态分数和下一步分数是审批判断置信度，不是功能质量分。
- 该阶段没有用 owner 钱包检查余额、请求 MetaMask、签名或广播。当前稳定 HTTPS 页面及 Codex 宿主原生弹窗仍待部署/实际体验；它们与“余额由钱包决定”的代码和 fixture 证据分开记录。

## 2026-10-09 — 创始人真实资金 bStocks NVDAB pilot 与交易后核验入口

- owner 在外部 Edge 购买复核页中看到 MetaMask 自动弹出的精确购买请求，并亲自确认一笔 7 USDT 的 bStocks NVDAB BSC 主网交易。主购买交易 `0xfecb1e0eaa526d9dbc845c7c964307200d8fa38e47e4dd5e34aa8c89c95c7cd6` 成功，Transfer 日志显示到账 `0.029960179248028382 NVDAB`；MetaMask 导入后显示约 `0.0300 NVDAB`。
- `0x32222508cf321b61727b569e16ad4077be550890e943910e6ca95f6ff0b41764` 是 MetaMask Gas Station 辅助交易，不是购买主体。结构化记录与 owner 指定的两张截图保存在本地工作流档案中，未纳入公开仓库。
- 购买页在得到有效购买哈希后显示精确 BscScan 链接，并用计划中的输出合约、符号、精度和可用 HTTPS 图标构造用户触发的 `wallet_watchAsset`。helper 不按 bStocks、Ondo 或具体股票写死；确定性测试覆盖 bStocks NVDAB、Ondo NVDAon 和 allowance 不显示该操作。
- 证据边界：真实资金只验证了这一条 bStocks NVDAB 标准 BSC EVM 路线。Ondo/RFQ、其他股票、钱包与宿主未做 funded pilot。购买计划现已附带后台 MCP App 监听；它会登记钱包哈希、核验 BSC 最终性和余额，并用持久化抢占/完成标记避免重复终局消息。该新版主动回报需在下一次 owner 真实购买中验证；本轮没有请求钱包、签名、广播或花费资金。
