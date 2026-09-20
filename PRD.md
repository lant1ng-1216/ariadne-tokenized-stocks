# Tokenized Stocks SDK + MCP

## 1. 产品概述

### 1.1 产品暂定名称

Tokenized Stocks SDK + MCP

名称暂不定稿。产品名称应体现“让 Agent 安全、准确地使用代币化股票”，而不是体现某个具体 Agent 或交易策略。

### 1.2 产品定位

本项目不是一个新的 Agent，也不是一个面向普通用户的独立交易平台。

本项目是一套面向代币化股票的开发者基础设施，由两部分组成：

1. 一个语义化、安全优先的 SDK；
2. 一个基于 SDK 的 MCP Server。

SDK 面向开发者、钱包、交易产品、机构和其他 Agent 应用。MCP 面向 Codex、Claude Code、ChatGPT 及其他支持 MCP 的现有 Agent。我们使用现有主流 Agent 作为测试和展示入口，不自行构建新的 Agent。

### 1.3 核心命题

底层 API 能提供数据和交易能力，但通用 Agent 未必理解：

- 同一家公司可能对应多个不同的代币化股票版本；
- ticker、公司名称和合约地址不是同一个概念；
- 链上价格、参考价格和传统市场官方报价可能不同；
- 传统市场闭市时，链上代币仍可能交易；
- 一笔交易可能包含授权、兑换和余额变化等多个步骤；
- Agent 不应在资产身份、价格语境和交易结果不清楚时直接执行。

因此，本项目要提供一层面向代币化股票的“语义理解、交易规划和安全执行能力”。

## 2. 产品目标与非目标

### 2.1 产品目标

- 让 Agent 能准确识别 bStocks、Ondo、xStocks 等代币化股票资产；
- 让 Agent 能用统一、结构化的方式查询 RWA、行情、钱包和 DeFi 信息；
- 让开发者通过少量 SDK 调用完成搜索、报价、模拟和执行流程；
- 让 MCP 客户端可以通过自然语言调用这些能力；
- 在执行交易前明确展示资产、价格、滑点、授权、预计余额变化和风险；
- 使用 Binance Web3 API 的多个模块形成真实的端到端 Demo；
- 提供一个可以继续扩展到交易、组合、再平衡、DeFi 和监控产品的基础底座。

### 2.2 明确不做的事情

- 不开发自己的通用 Agent；
- 不开发新的聊天客户端；
- 不替用户判断应该买哪只股票；
- 不承诺收益或预测股价；
- 不在第一版实现自动高频交易；
- 不默认实现借贷、杠杆或永续合约；
- 不把所有 DeFi 协议都抽象成已经支持的能力；
- 不把低级 Binance API 简单重新命名后称为 SDK；
- 不在用户没有明确确认时执行真实交易。

## 3. 目标用户

### 3.1 开发者

希望在钱包、交易界面、组合工具、Telegram Bot 或其他 Agent 中接入代币化股票能力的开发者。

### 3.2 Agent / AI 应用开发者

希望让现有 Agent 查询和执行代币化股票操作，但不想自行处理资产识别、报价、授权、模拟和风险检查的开发者。

### 3.3 普通 Agent 用户

他们不直接接触 SDK，而是通过 Codex、Claude Code、ChatGPT 等 MCP 客户端使用能力。例如查询股票代币、查看钱包持仓、生成交易计划和确认交易。

### 3.4 钱包和机构

希望把统一的代币化股票数据和交易前安全检查接入自己的产品。第一版不专门建设企业控制台，但 SDK 的接口设计应允许未来加入权限、审计和策略限制。

## 4. 用户价值

### 对开发者

不用分别拼接 RWA Data、Market、Trading、Wallet、DeFi 和 Transaction API，也不用自己处理不同代币版本和交易模拟。

### 对 Agent

得到的是“搜索资产、生成交易计划、模拟交易”这样的高层工具，而不是容易误用的低级接口。

### 对普通用户

即使不懂合约地址、API 和 DEX，也可以让自己信任的 Agent 解释资产并在确认前展示具体交易后果。

### 对生态

降低其他产品使用 BSC 代币化股票的门槛，使 Binance Web3 API 更容易被 Agent 和第三方开发者采用。

## 5. 核心使用场景

### 场景 A：准确搜索资产

用户通过 MCP 客户端说：

> 查一下 BSC 上的 NVIDIA 代币。

系统返回所有匹配版本，并区分发行平台、符号、合约地址、价格、参考价格、市场状态和更新时间，而不是只返回一个模糊 ticker。

### 场景 B：比较同一底层资产的不同版本

用户说：

> AAPLx 和 AAPLon 有什么区别？

系统返回发行平台、链、合约、价格口径、市场状态、流动性和可用操作。产品不直接告诉用户哪一个“更值得买”，只提供可验证的信息。

### 场景 C：生成交易计划

用户说：

> 用 100 USDT 买 NVIDIA 代币，最大滑点 0.5%，先不要执行。

系统完成资产解析、报价、滑点检查和交易计划生成，等待用户确认。

### 场景 D：模拟并执行交易

用户确认后，系统构建授权和 Swap 交易，调用 Transaction API 模拟，展示预计余额变化；只有模拟通过且用户再次确认后，才广播已签名交易。

### 场景 E：解释钱包中的股票敞口

用户说：

> 我钱包里到底持有哪些代币化股票？科技股敞口是多少？

系统读取钱包余额和组合信息，按照底层公司、行业和发行平台进行归类。第一版可以先实现资产列表和底层资产归并，风险分析保持为基础信息，不做投资建议。

## 6. 产品架构

```text
Binance Web3 API
        |
        v
Binance API Adapter
        |
        v
Tokenized Stocks Semantic Core
  - Asset Identity
  - Market Context
  - Portfolio Normalization
  - Quote & Route
  - Intent Planning
  - Safety Checks
  - Simulation
        |
   +----+----+
   |         |
   v         v
 SDK       MCP Server
   |         |
   +----+----+
        v
 Existing Agents / Apps
```

### 6.1 Binance API Adapter

负责认证、签名、请求、错误处理、重试、超时和原始响应标准化。该层不直接暴露给最终 MCP 工具。

### 6.2 Semantic Core

这是项目的核心。它将原始 API 响应转换为稳定的领域对象：资产、市场状态、持仓、报价、交易计划和模拟结果。

### 6.3 SDK

提供给 TypeScript 开发者使用。未来可增加 Python SDK，但比赛第一版优先保证 TypeScript 完整可用。

### 6.4 MCP Server

基于 SDK 暴露高层工具、资源和必要的提示模板。MCP 层不复制业务逻辑，所有核心判断必须来自 SDK。

## 7. SDK 核心模块

### 7.1 AssetResolver

职责：搜索和确认代币化股票身份。

建议接口：

```ts
resolveAsset(query: string, options?: ResolveOptions): Promise<StockAsset[]>
getAssetIdentity(assetId: string): Promise<StockAssetIdentity>
compareAssets(assetIds: string[]): Promise<AssetComparison>
```

核心返回字段：

- underlyingTicker；
- underlyingName；
- platformId；
- tokenSymbol；
- tokenContractAddress；
- chainId；
- tokenToShareRatio；
- source timestamps；
- market status；
- attestation links；
- identity confidence / unresolved fields。

### 7.2 MarketContext

职责：提供价格及其语境。

建议接口：

```ts
getMarketContext(assetId: string): Promise<MarketContext>
getPriceGap(assetId: string): Promise<PriceGap>
getTradingSnapshot(assetId: string): Promise<TradingSnapshot>
```

必须明确区分：

- token price；
- reference price；
- price timestamp；
- market status；
- liquidity；
- volume；
- quote freshness；
- 是否处于非传统交易时段。

### 7.3 Portfolio

职责：读取钱包资产并归并底层敞口。

建议接口：

```ts
getWalletStockHoldings(walletAddress: string): Promise<StockHolding[]>
getUnderlyingExposure(walletAddress: string): Promise<UnderlyingExposure[]>
```

### 7.4 QuoteEngine

职责：查询代币兑换报价和可用路径。

```ts
getQuote(params: QuoteParams): Promise<QuoteResult>
buildSwap(params: SwapParams): Promise<UnsignedAction[]>
```

报价必须包含有效期，不能把短时间有效的 quote 当作长期价格。

### 7.5 IntentPlanner

职责：把结构化用户意图转换成交易计划，不直接执行。

```ts
createTradePlan(intent: TradeIntent): Promise<TradePlan>
createPortfolioActionPlan(intent: PortfolioIntent): Promise<ActionPlan>
```

交易计划应说明：资产、数量、支付资产、路径、预计结果、滑点、授权、费用、失败条件和用户需要确认的内容。

### 7.6 SafetyChecker

职责：检查资产身份、价格新鲜度、滑点、授权、余额变化和模拟结果。

```ts
checkAssetIdentity(plan: TradePlan): Promise<CheckResult>
checkQuoteRisk(plan: TradePlan): Promise<CheckResult>
checkSimulationResult(result: SimulationResult): Promise<CheckResult>
runSafetyChecks(plan: TradePlan): Promise<SafetyReport>
```

安全检查失败时必须返回可解释原因，而不是只有错误码。

### 7.7 Simulator / Executor

```ts
simulate(action: UnsignedAction): Promise<SimulationResult>
executeConfirmed(action: SignedAction): Promise<ExecutionResult>
```

`executeConfirmed` 不应接受未经用户确认的抽象自然语言请求，只接受已经生成并确认的结构化动作。

## 8. MCP 接口设计

第一版建议暴露以下工具：

### `resolve_tokenized_stock`

按 ticker、公司名、平台或合约地址查询代币化股票。

### `compare_stock_wrappers`

比较同一底层资产的多个代币版本。

### `get_stock_market_context`

获取价格、参考价、更新时间、市场状态、流动性和交易数据。

### `get_wallet_stock_exposure`

查询钱包中的代币化股票及底层公司归并结果。

### `create_stock_action_plan`

根据结构化意图创建买入、卖出或兑换计划，不执行交易。

### `simulate_stock_action`

对计划中的交易进行链上模拟，返回余额变化、授权变化和预计结果。

### `execute_confirmed_stock_action`

仅执行已经由用户明确确认且已签名的交易。

MCP 返回结果应包含机器可读 JSON，同时包含 Agent 可以直接向用户解释的简洁摘要。

## 9. 安全设计原则

### 9.1 资产身份优先

任何执行动作都必须绑定明确的链、合约地址、平台和代币符号，不能只绑定 ticker。

### 9.2 计划与执行分离

查询、规划、模拟和执行必须是不同步骤。Agent 不应通过一次模糊调用直接完成真实交易。

### 9.3 用户确认边界

真实交易必须由用户确认并签名。SDK 不托管用户私钥。

### 9.4 结果可预览

执行前展示预计收到资产、授权对象、滑点、费用和交易后余额。

### 9.5 不把参考价包装成公平价值

系统应使用“参考价格”或“数据源价格”等准确措辞，不宣称它是传统交易所官方报价。

### 9.6 明确不确定性

当多个代币版本无法自动判断、市场数据过期、流动性不足或 API 未提供足够信息时，应返回“需要确认”或“无法判断”，而不是猜测。

## 10. 最小可行版本 MVP

MVP 不追求覆盖所有代币化股票和所有 DeFi 协议，而是完成一条可信的端到端链路：

1. 搜索一个底层公司；
2. 返回多个代币版本；
3. 显示平台、合约、链、价格、参考价格和市场状态；
4. 查询钱包中相关持仓；
5. 用 USDT 获取代币化股票报价；
6. 构建授权和 Swap；
7. 调用 Transaction API 模拟；
8. 展示余额变化和安全检查结果；
9. 通过 MCP 让 Codex 或 Claude Code 完成同一流程；
10. 由用户确认后使用小额资金完成 BSC 主网 Demo。

## 11. 比赛展示方案

### Demo 主题

“让现有 Agent 安全地理解和操作代币化股票。”

### Demo 流程

在 Codex 或 Claude Code 中接入 MCP，然后输入：

> 查找 BSC 上的 NVIDIA 代币，比较不同版本。然后用 50 USDT 选择一个流动性合理、最大滑点不超过 0.5% 的版本，先模拟，不要执行。

Agent 应展示：

- 多个资产版本；
- 资产身份差异；
- 市场状态；
- 价格和参考价格；
- 报价和滑点；
- 交易计划；
- 模拟结果；
- 明确等待用户确认。

随后用户输入：

> 我确认执行。

系统才执行已签名交易。

### 比赛能力映射

| 比赛关注点 | 本项目体现方式 |
|---|---|
| RWA Data | 资产搜索、平台、参考价格、市场状态、底层资料 |
| Market API | 行情、交易量、流动性和价格语境 |
| Trading API | 聚合报价、授权和 Swap 构建 |
| Wallet API | 余额、持仓和组合信息 |
| Transaction API | 模拟、结果预览和广播 |
| Agentic Wallet / Wallet Skills | 通过现有 Agent 调用 MCP 并完成确认后的执行 |
| MCP / SDK | 项目本身的核心交付物 |

## 12. 评审竞争力

### 技术实现

不是只调用一个行情接口，而是串联资产识别、市场数据、钱包、报价、交易构建和模拟。

### 创意

创意不在于重新做一个交易 Agent，而在于为 Agent 提供代币化股票领域的语义和安全基础设施。

### 用户体验

用户可以用自然语言使用，开发者也可以用 SDK 集成；查询、计划、模拟和执行过程清晰可见。

### 开发者体验报告

记录：

- 从打开文档到第一次 API 调用所需时间；
- 签名和认证中的困难；
- API 返回结构和错误信息；
- 价格和参考价格的边界；
- 模拟结果与真实交易的差异；
- MCP 接入主流 Agent 的过程；
- SDK 哪些抽象真正降低了开发成本；
- Binance API 还缺少哪些能力。

## 13. 风险与待验证事项

- RWA API 当前是否覆盖 bStocks、Ondo 和 xStocks 的全部可用版本；
- API 返回的市场状态和参考价格更新时间是否足够可靠；
- 聚合报价是否能覆盖目标股票代币的真实流动性；
- DeFi API 支持哪些具体协议和投资产品；
- 是否可以稳定构建授权、Swap 和模拟交易；
- MCP 客户端对结构化返回和确认流程的支持情况；
- Agent 是否会正确遵守“先规划、再模拟、再确认、后执行”；
- BSC 主网小额交易的实际滑点、失败率和延迟；
- API 速率限制和高频查询成本；
- 合规、地域和资产可用性边界。

## 14. 后续版本方向

### V1.1

- 更完整的资产归并；
- 价格偏离监控；
- 定时行情检查；
- 可配置滑点和交易限制；
- 更丰富的 MCP 资源和提示模板。

### V2

- Auto-DCA 和再平衡的计划接口；
- DeFi 产品筛选和存入/赎回；
- 组合级风险和底层资产敞口；
- Telegram、钱包和交易界面的集成示例；
- Python SDK；
- 机构权限、审计日志和审批流程。

借贷、杠杆、自动交易和收益策略只有在具体协议、API 和风险模型验证后才考虑，不属于 MVP 默认范围。

## 15. 一句话总结

我们不做另一个 Agent，而是做一套让现有 Agent 能够准确识别、理解、模拟并安全操作 BSC 代币化股票的 SDK + MCP 基础设施。

## 16. 产品形态的进一步定义

### 16.1 产品不是一个单独的前端页面

本项目的主要交付物不是一个必须由用户打开的交易网站，而是一套可以被不同产品调用的能力层。

它可以被部署成：

- 一个 npm package；
- 一个本地或远程 MCP Server；
- 一个可供其他应用调用的服务；
- 一个带有 Demo 配置的开源仓库；
- 一组可被 Agent 发现和调用的工具、资源及提示模板。

项目可以提供一个非常轻量的测试界面或命令行，但该界面只用于展示和验证，不应成为产品价值的唯一载体。

### 16.2 SDK 是产品核心，MCP 是分发和使用入口

SDK 负责稳定、可测试和可复用的业务能力。它应当能够在没有 Agent 的情况下被普通 TypeScript 应用直接调用。

MCP Server 负责把 SDK 能力转换为 Agent 能理解的工具。MCP 不应重新实现资产识别、交易计划和安全判断，否则 SDK 与 MCP 会产生两套不一致的逻辑。

推荐的责任分工是：

```text
SDK：定义正确的领域模型和安全流程
MCP：把领域模型暴露给 Agent
Agent：理解用户语言、选择调用时机、向用户解释结果
用户：决定是否执行真实操作并完成签名
```

### 16.3 三种使用方式

#### 方式一：开发者直接调用 SDK

适合钱包、交易界面、组合工具、Telegram Bot、自动化服务或其他 Web3 应用。

开发者可以只使用一部分能力，例如只使用资产解析和市场状态，也可以完整使用交易计划和模拟流程。

```ts
const matches = await stocks.assets.search("NVIDIA");
const context = await stocks.market.context(matches[0].assetId);
const plan = await stocks.actions.plan({
  type: "swap",
  from: { symbol: "USDT", amount: "50" },
  to: matches[0].assetId,
  constraints: { maxSlippageBps: 50 }
});
const preview = await plan.simulate();
```

#### 方式二：Agent 通过 MCP 调用

适合不想自行编程的用户和使用 Codex、Claude Code、ChatGPT 等 Agent 的开发者或爱好者。

用户不需要了解 SDK 的方法名，而是用自然语言表达目标。Agent 调用 MCP 工具，并把结果整理成用户能理解的答案。

#### 方式三：机构或应用作为中间层集成

钱包、交易平台或机构可以在自己的产品里调用 SDK，将资产身份、交易前检查和模拟能力接入现有流程。

这类使用方式未来需要加入 API key 管理、权限策略、审计日志和管理员配置，但不属于第一版必须完成的企业控制台。

## 17. 面向三类用户的设计

### 17.1 开发者用户

#### 用户问题

开发者想接入代币化股票，但不希望自己处理：

- 不同发行平台的资产识别；
- RWA 数据、行情数据和钱包数据的格式差异；
- Binance API 签名和错误处理；
- 报价有效期和交易构建；
- 授权、模拟、广播等多个交易步骤；
- Agent 可能误用低级 API 的问题。

#### 需要的产品能力

- 清晰的 TypeScript 类型；
- 统一的错误模型；
- 高层级的领域方法；
- 可单独使用的只读功能；
- 计划和执行分离；
- 模拟结果结构化返回；
- 适合测试的 Mock Provider；
- 真实 Binance API Provider；
- 可观测的请求和响应日志。

#### 开发者体验目标

开发者应能在较短时间内完成：

1. 安装 SDK；
2. 配置 API key；
3. 搜索一个代币化股票；
4. 获取市场上下文；
5. 创建交易计划；
6. 模拟一笔交易。

开发者不应在第一次调用时就必须理解所有底层 endpoint。

### 17.2 Agent 使用者

#### 用户问题

用户可能知道自己想做什么，但不知道：

- 哪个合约才是正确资产；
- 多个股票代币版本有什么区别；
- 现在的价格是否来自正常交易时段；
- 交易会花费什么、收到什么；
- Agent 是否已经执行了真实交易；
- 交易前为什么需要授权。

#### 需要的产品能力

- 面向自然语言的高层 MCP 工具；
- 结果中同时包含摘要和机器可读字段；
- 自动发现歧义并要求确认；
- 交易计划和执行分离；
- 明确的“尚未执行 / 已模拟 / 等待签名 / 已广播”状态；
- 在回答中显示合约地址、代币版本和关键风险。

#### 典型用户体验

用户说：

> 我想买 NVIDIA 的链上股票。

Agent 不应该直接挑一个资产下单，而应先说：

> 找到多个 NVIDIA 代币版本。它们来自不同平台，合约地址、价格和可用流动性不同。我可以先帮你比较，或者按你指定的平台继续。

用户说：

> 用 50 USDT 买入，最大滑点 0.5%，先模拟。

Agent 才进入交易计划和模拟流程。

### 17.3 机构和产品集成用户

#### 用户问题

机构更关心一致性、可审计性和可控性，而不是自然语言体验。它们需要确保：

- 所有交易都经过同一套检查；
- 资产和合约不会被 Agent 模糊替换；
- 交易规则可配置；
- 可以限制可用链、平台、资产和金额；
- 能追踪谁生成了计划、谁确认了交易；
- 能在未来更换数据源或交易执行器。

#### 未来所需能力

- Policy Engine；
- 只读模式和执行模式；
- 单笔和每日金额限制；
- 允许的平台和 token allowlist；
- 多人审批；
- 审计事件；
- 自定义风险检查；
- Webhook 和监控。

第一版不需要完整实现这些企业功能，但领域模型和 SDK 接口不能阻碍未来加入。

## 18. Action Plan 机制

“计划”是本产品区别于普通 API wrapper 的关键抽象。

### 18.1 为什么需要计划

如果 Agent 直接从用户语言跳到交易调用，用户无法清楚知道：

- Agent 选择了哪个资产；
- 使用了哪条交易路径；
- 授权了什么；
- 预计收到什么；
- 交易失败时会发生什么。

因此所有有副作用的动作，都应先生成一个不可执行或未确认的 `ActionPlan`。

### 18.2 ActionPlan 的主要内容

```ts
type ActionPlan = {
  planId: string;
  status: "draft" | "simulated" | "awaiting_confirmation" | "confirmed" | "executed" | "failed";
  intent: Intent;
  assetContext: AssetContext;
  route: RouteStep[];
  constraints: UserConstraints;
  expectedChanges: BalanceChange[];
  approvals: ApprovalChange[];
  fees: FeeEstimate[];
  safetyReport: SafetyReport;
  expiresAt: string;
  requiresUserConfirmation: boolean;
};
```

### 18.3 计划状态

- `draft`：刚根据意图生成，还没有模拟；
- `simulated`：已完成模拟，有预计余额变化；
- `awaiting_confirmation`：模拟通过，等待用户确认；
- `confirmed`：用户确认了计划，但可能尚未签名；
- `executed`：交易已经广播并返回结果；
- `failed`：模拟、签名、广播或链上执行失败。

### 18.4 计划的失效条件

计划不能永久有效。以下情况出现时，应要求重新生成或重新模拟：

- quote 过期；
- 用户指定的最大滑点已无法满足；
- 资产市场状态变化；
- 价格数据过期；
- 钱包余额或授权发生变化；
- 交易 calldata 发生变化；
- 用户修改了金额、资产或约束。

### 18.5 计划不是投资建议

计划只回答：

> 如果用户决定执行某个明确动作，系统如何准确、安全地准备这个动作？

计划不回答：

> 用户应该买什么、什么时候买、能不能赚钱。

## 19. 资产语义模型

### 19.1 为什么不能只使用 ticker

代币化股票场景中，ticker 可能指向：

- 底层公司；
- 某个平台的 token symbol；
- 不同发行方的同一底层资产；
- 不同链上的包装；
- 用户口语中的简称。

因此系统内部必须以唯一资产身份作为主键，至少包含：

- chainId；
- tokenContractAddress；
- platformId；
- tokenSymbol；
- underlyingTicker；
- underlyingName。

### 19.2 资产身份的置信度

如果用户只输入“Apple”，系统可能找到多个结果。此时应返回多个候选和选择原因，而不是把第一个结果当成确定答案。

可以为资产解析结果设置：

- `exact`：用户提供了合约地址或唯一匹配；
- `platform_scoped`：用户指定了发行平台；
- `ticker_match`：通过 ticker 匹配；
- `ambiguous`：存在多个同等可能结果。

当结果为 `ambiguous` 时，执行类工具不得自动继续。

## 20. MCP 设计原则

### 20.1 MCP 工具应面向任务，而不是面向 endpoint

不建议直接暴露：

```text
get_rwa_token_list
get_rwa_token_price
get_market_price
get_aggregator_quote
build_swap_transaction
```

然后要求 Agent 自己猜测调用顺序。更好的方式是暴露：

```text
resolve_tokenized_stock
get_stock_market_context
create_stock_action_plan
simulate_stock_action
execute_confirmed_stock_action
```

底层 endpoint 如何组合，应由 SDK 负责。

### 20.2 只读工具和执行工具分开

只读工具可以返回信息；执行工具必须显式表达它会产生副作用。

建议分为：

- `read_*`：查询和解释；
- `plan_*`：生成计划，不执行；
- `simulate_*`：模拟，不广播；
- `execute_*`：执行已确认动作。

### 20.3 工具描述必须包含边界

每个 MCP 工具的描述中应说明：

- 该工具是否会改变链上状态；
- 是否需要用户确认；
- 返回的是估算值还是实际结果；
- 数据更新时间；
- 失败时不会发生什么。

### 20.4 MCP 结果要适合 Agent 解释

结果不能只有一大段原始 JSON，也不能只有一句“成功”。应同时提供：

- `summary`：给用户看的简短说明；
- `data`：给 Agent 和程序处理的结构化数据；
- `warnings`：需要展示的风险或不确定性；
- `nextAction`：建议下一步是确认、重新查询还是停止。

## 21. 典型工作流设计

### 21.1 研究工作流

```text
用户问题
  ↓
资产解析
  ↓
资产版本比较
  ↓
市场上下文
  ↓
结构化回答
```

这个流程完全只读，不需要钱包签名。

### 21.2 交易工作流

```text
用户表达明确意图
  ↓
解析资产和金额
  ↓
检查余额和约束
  ↓
获取报价
  ↓
构建 ActionPlan
  ↓
模拟交易
  ↓
展示预计结果和风险
  ↓
用户确认
  ↓
用户签名
  ↓
广播并查询结果
```

### 21.3 钱包组合工作流

```text
钱包地址
  ↓
读取余额和交易记录
  ↓
识别代币化股票
  ↓
归并底层公司
  ↓
计算基础敞口
  ↓
返回组合摘要
```

第一版不做投资建议，只展示用户实际持有的资产和归并后的基础敞口。

## 22. 版本范围重新划分

### MVP 必做

- TypeScript SDK；
- Binance Web3 API 认证和基础 Adapter；
- RWA 资产搜索与身份标准化；
- 价格、参考价和市场状态；
- BSC 钱包余额或股票持仓查询；
- 聚合报价；
- Swap 或至少一个真实交易动作的构建；
- 交易模拟；
- ActionPlan 状态机；
- MCP Server；
- 通过 Codex 或 Claude Code 完成一次完整演示；
- README、示例代码和开发体验记录。

### MVP 可选

- 多个发行平台的比较；
- Portfolio 底层敞口归并；
- DeFi 产品读取；
- DeFi 存入或赎回；
- Telegram 作为第二个 MCP 客户端示例；
- Python SDK 的只读部分。

### 暂不纳入 MVP

- 自动化长期运行 Agent；
- 自动 DCA 调度器；
- 借贷和清算系统；
- 收益策略金库；
- 自建托管钱包；
- 自建交易所或流动性池；
- 完整机构后台；
- 预测股价或量化信号。

## 23. 可验收标准

### SDK 验收

- 能通过统一方法搜索至少一种比赛要求的代币化股票资产；
- 返回结果包含链、合约地址、平台和底层 ticker；
- 能区分至少两个同一底层资产的不同版本，或能明确返回“无法区分”；
- 能返回链上价格、参考价格和时间字段；
- 能获取交易报价并处理 quote 过期；
- 能生成交易计划；
- 能模拟交易并展示余额变化；
- 错误信息可被开发者理解。

### MCP 验收

- Codex 或 Claude Code 能发现 MCP 工具；
- Agent 能完成只读资产查询；
- Agent 能完成资产版本比较；
- Agent 能生成交易计划而不是直接执行；
- Agent 能读取模拟结果；
- 未确认时执行工具拒绝执行；
- 用户确认后可以完成小额 BSC 主网交易或可复现的完整 dry-run。

### 产品验收

- 普通用户能理解当前是否已经执行交易；
- 开发者能根据 README 在合理时间内完成第一次调用；
- 关键风险和不确定性没有被隐藏；
- Demo 能在四分钟以内解释产品为什么不是普通 API wrapper。

## 24. 研究与开发顺序

### 阶段一：API 可行性验证

- 获取 API key；
- 完成签名；
- 分别测试 RWA、Market、Wallet、Trading 和 Transaction API；
- 记录响应字段、错误、延迟和实际覆盖范围；
- 确认目标股票代币在 BSC 上是否有可交易流动性。

### 阶段二：领域模型

- 定义 `StockAsset`；
- 定义 `MarketContext`；
- 定义 `TradePlan`；
- 定义 `SafetyReport`；
- 定义错误和状态模型；
- 用真实 API 响应编写 fixture。

### 阶段三：SDK

- 完成 Adapter；
- 完成资产解析；
- 完成行情上下文；
- 完成报价与交易计划；
- 完成模拟；
- 编写单元测试和集成测试。

### 阶段四：MCP

- 将 SDK 能力暴露为高层工具；
- 编写工具描述和返回结构；
- 接入 Codex 或 Claude Code；
- 测试 Agent 是否会正确处理歧义、模拟和确认。

### 阶段五：Demo 和报告

- 使用小额或 dry-run 完成完整流程；
- 记录 API 的真实优缺点；
- 录制四分钟以内 Demo；
- 完成开发者体验报告；
- 整理 README 和部署说明。

## 25. 关键决策

当前建议确认以下产品决策：

1. 产品核心是 SDK，MCP 是基于 SDK 的 Agent 接入层；
2. 不自行开发通用 Agent；
3. 重点不是预测或投资建议，而是资产语义、交易计划和安全执行；
4. 计划机制是 SDK 的核心抽象；
5. MVP 聚焦查询、比较、报价、模拟和确认执行；
6. 借贷、收益和自动化策略暂时只作为扩展方向；
7. 通过 Codex 或 Claude Code 展示普通用户和开发者都可以使用，但不把它们作为我们要重新开发的产品。

## 26. 尚未决定的事项

以下内容在技术验证前不强行定案：

- 产品最终名称；
- TypeScript SDK 的包名；
- 是否同时提供 Python SDK；
- 远程 MCP 还是本地 MCP 优先；
- 第一条完整交易选择买入、卖出还是兑换；
- 是否加入 DeFi 存入和赎回；
- 是否提供最小化 Web Playground；
- 是否将组合敞口作为 MVP 展示重点；
- 是否申请 Agentic Wallet / Wallet Skills 特别奖。

这些事项应根据 API 实测结果、实现成本和 Demo 效果决定，而不是仅凭概念判断。
