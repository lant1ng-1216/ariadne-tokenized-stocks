# Ariadne 产品体验与交互评估

更新日期：2026-10-05
关注对象：通过 Agent 使用 MCP 的用户、直接使用 SDK 的开发者，以及集成 MCP App 的宿主。

## 产品体验目标

Ariadne 不要求用户先理解多个上游 API，也不把发行方不同的代币化表示压成一个模糊的 ticker。用户可以用自然语言提出研究问题；Agent 通过 MCP 调用 Ariadne，得到保留来源和数据缺口的结果。开发者则可绕过 Agent，直接从 TypeScript SDK 调用同一领域能力。

产品体验是否可靠，不能只看“工具返回了文本”。需要同时检查：资产身份是否完整、缺失数据是否如实呈现、文本与结构化输出是否一致、MCP 原生卡片是否展示同一事实，以及操作相关结果有没有越过确认和签名边界。

## Agent 用户路径

以研究某家公司在 BNB Chain 上的代币化股票表示为例：

1. 用户提出自然语言问题，并明确只研究、不交易。
2. Agent 宿主选择或调用 `research_tokenized_stock`。
3. Ariadne 返回上游实际匹配到的表示，分别展示发行方、平台、链、合约、代币符号和市场上下文。
4. 输出说明价格/参考价格、可计算的差异、市场状态、来源时间、缺失字段和警告。
5. 对支持 MCP Apps 的宿主，Agent 可将相同研究结果交给 Ariadne 的只读 MCP App 卡片呈现；其他宿主可使用文本与结构化结果。

高层工具减少了用户手动串联发现、比较、行情与警告的负担。它不会让 Agent 自动获得交易授权；报价、计划、模拟、确认、外部钱包签名和广播仍是分开的步骤。

## MCP 原生 UI

Ariadne 的研究卡片属于 MCP 工具交互本身：它用发行方卡片、渐进式细节、市场状态和数据来源呈现研究结果，而不是只把一大段原始 JSON 塞进聊天，也不要求 Agent 把 Markdown 表格伪装成稳定 UI。

卡片和 MCP 文本/结构化结果来自同一领域数据。当前本地 UI 测试覆盖 MCP Apps 客户端握手、结构化结果与文本通知渲染、视图切换、字段转义及结果一致性。真正的显示仍取决于 Agent 宿主是否实现 MCP Apps；同一资源在不同宿主上的布局、尺寸和交互并未被证明完全一致。

独立 SDK 接入方负责自己的 UI。SDK 给出有类型的资产、行情、警告和执行状态，不规定应用必须采用 Ariadne 的 MCP 卡片样式。

## 输出质量与信任信息

研究结果优先让用户分清“来源事实”和“Ariadne 的解释”：

- 同一个标的可以有多个发行方、平台、合约和市场条件，不能只按 ticker 合并。
- 上游返回的搜索匹配不是完整市场目录。若目录计数或筛选语义未能确认，输出应明确指出未知，而不是声称“全部资产”。
- 缺失的流动性、状态、更新时间不会被补成 0 或当前时间。
- 上游原始状态与用于安全判断的归一化状态并列保留；未知或矛盾状态仍需醒目呈现。
- 每个结果的来源与副作用状态应让 Agent 和用户都能辨认。

中文和英文研究结果均有本地覆盖。自动工具选择不是 Ariadne 可以保证的行为：它受 Agent 模型、宿主配置及其工具路由策略影响；需要确定性时，用户或开发者可以直接调用 MCP 工具或 SDK 方法。

## 开发者体验

SDK 可独立集成，无需运行 MCP 服务或依赖特定 Agent。开发者可用 `.env` 配置自己的 Binance Web3 API 凭证，或先通过合成 Demo 验证只读研究路径。示例和独立消费者检查用于验证发布 tarball 中的运行时代码、类型声明、签名请求和搜索到行情上下文流程。

当前包可本地构建并做隔离安装验证，但还未发布到 npm。Hosted MCP 是本地演示，不是线上服务。任何公开发布、远程部署和凭证托管都需要单独完成。

### Developer Experience Report：可复现步骤与实测结果（2026-10-05）

**Judge-followable credential-free path.** 从仓库根目录执行 `npm ci`、`npm run mcp:config:demo`，将输出的 MCP 配置加入支持 MCP 的 Agent，再用 Quickstart 中的 NVDA 研究提示询问发行方比较和数据缺口。Demo 结果固定、带合成数据说明，不需要 Binance 凭证或钱包。SDK 路径见本报告关联的 [`SDK_USAGE.md`](SDK_USAGE.md)：构建并 `npm pack` 本地包；先运行 `npm run example:sdk` 查看完整候选列表，再把明确选中的 `assetId` 传给 `npm run example:sdk -- <assetId>` 请求对应表示的行情上下文。Live 研究需要用户自行配置本地 `.env`；当前 SDK 未发布到 npm。

**有界 Live API 实测（2026-10-04）。** 一次本地隔离 ESM 消费者运行对 BSC `NVDA` 发起了 6 个只读 GET 请求，6 次成功且均为首次尝试；搜索耗时 436 ms，两个表示的行情上下文分别耗时 919 ms 与 925 ms，总计 2,279 ms。实际返回 Ondo `NVDAon`（`0xa9ee28c80f960b889dfbd1902055218cba016f75`）和 bStocks `NVDAB`（`0x02fca66c1d1afb4e2a7884261eb00f63598a7436`）。结果保留了价格、参考价、来源端点、逐资产时间戳和数据警告；流动性未提供，bStocks 的市场状态未知。此为一次开发观测，不是性能承诺、完整目录或行情 SLA。

同日连接的 Codex MCP 只读流程先遇到一次 `research_tokenized_stock` 上游 HTTP 200 内部错误（`sideEffects=none`），随后较低层的发现、比较和 bStocks 行情上下文调用成功，返回同一组发行方身份，并保留未知市场状态、未提供流动性及目录不完整性警告。失败原因未能从这一次观测确定，也没有重复循环该失败请求。2026-10-05 的 `test:mcp-natural-language` 又以 Live 模式验证了中英文研究、两种 NVDA 表示、来源/时间戳与 MCP App 资源关联，结果状态为 warning、`sideEffects=none`；该集成检查不是任意宿主自动选工具的证明。

**已验证的新手摩擦及修复。** 旧 SDK 示例在搜索返回多个发行方时直接读取 `assets[0]`，会在未询问开发者的情况下替其选定第一个表示。现示例逐项打印 `assetId`、平台、代币符号和合约，并要求调用者传入精确 `assetId` 后才请求行情。旧 `search()` 也会把空白词发给供应商；现在空串和纯空白在本地以固定的 `TypeError: TokenizedStocksService.search query must not be empty` 拒绝，非空词先 trim。隔离 cleanroom 使用回环合成服务验证两个 issuer、显式 bStocks 选择、运行时代码和声明导入，并确认两类无效搜索在 0 次供应商请求时失败。这些 SDK 回归数据是合成证据，和上述 Live API 观察分开记录。

**Owner-only 定性输入（非代表性用户研究）。** 用户提供的重载后截图确认，当前连接的 Codex MCP App 中，`Unknown` 状态徽标与报价时间不再重叠；这只覆盖一个宿主和一个视图。用户还明确要求工作报告标出当前阶段、具体任务、通过/未通过项及原因。这是项目 owner 对协作与单次宿主体验的反馈，不是可推广的用户评分或可用性研究样本。

最终复核中，Live MCP 测试确认 18 个工具可列出，并验证发现、比较、若干 Live 工具响应及未注册广播在本地 registry 被拒绝。复核脚本的 `create_stock_action_plan` 断言接受 `awaiting_confirmation` **或** `failed`，使用零地址且没有传入可确认所需的 Gas 预算；因此只证明收到了计划响应，不证明 Live 计划可执行。此前脚本把这个响应误标为 `planSucceeded`，现改为输出真实 `planStatus` 和 `planAwaitingConfirmation`。其 `simulate_stock_action_plan` 使用未注册的合成计划并断言拒绝；独立 `simulate_stock_action` 发送的是零值占位交易，也没有断言一份真实 ActionPlan 的模拟成功，现仅报告收到了零值模拟响应。钱包暴露和订单状态调用同样使用零地址。Demo 测试独立验证七个固定合成 ticker、issuer 比较和安全拦截。确认流程、执行防护与签名载荷测试使用进程内夹具或确定性测试密钥；它们证明本地状态机和拒绝条件，不证明真实钱包签名、资金广播或链上结算成功。完整研究结论见 [`DEVELOPER_EXPERIENCE_REPORT.md`](DEVELOPER_EXPERIENCE_REPORT.md)，复现步骤与边界见 [`QUICKSTART.md`](QUICKSTART.md)。

## 真实资金交易闭环审查（2026-10-05）

| 环节 | 当前实现与证据 | 判断 |
|---|---|---|
| 自然语言研究、发现、发行方比较与研究卡 | Live MCP 中英文只读查询返回两种 NVDA 表示、来源和警告；当前 Codex 宿主重载后的研究卡由用户确认无重叠。 | **已验证研究路径**；不等于交易闭环。 |
| 交易报价 | 标准 EVM 和 RFQ 报价接口已接入。9 月 20 日实验记录中，bStocks 标准路由和 Ondo RFQ 路由各有 10 次 HTTP 200 / business code 0 的报价响应；两组使用零地址、没有广播。 | **报价端点有 Live 观察**；没有证明真实用户资金、有效余额或最终可执行交易。 |
| 计划和交易构造 | `createActionPlan()` 会取行情与报价、读取输入 ERC-20 余额和 allowance、安全检查并尝试构建无签名动作。2026-10-05 修正前的 Live MCP 检查实际返回 `failed`：市场类别未知、零地址输入币余额不足、ERC-20 allowance 不足。修正后 Live 重跑明确观察到类别 `unknown`、`openState:true`，可交易性检查通过但保留 warning；计划仍因零地址输入余额和 allowance 不足而 `failed`。 | **当前 Live 路由已验证状态检查按字段语义工作；计划未到 `awaiting_confirmation`，真实交易未验证。** |
| allowance 首次授权 | allowance 不足会阻断计划并返回 `approvalRequired`。有单独的 approval-transaction 构造方法，但它没有接入 ActionPlan 的阶段编排、外部签名、授权后重读 allowance 和重新报价流程。 | **首用授权链未闭合。** 已有授权的钱包可能绕过此分支，但尚无真实验证。 |
| 交易模拟与确认 | 有针对计划的模拟和 MCP 显式 approve/decline 表单。当前 Live 测试中的计划模拟输入是 registry 外的占位计划，正确地被拒绝；完整成功状态机来自本地合成演练。 | **状态机有合成验证；真实报价计划的 Live 模拟和用户确认未验证。** |
| 钱包签名与广播 | SDK/MCP 只接收外部签好的交易；Ariadne 校验计划、签名者、链、目标、calldata、Gas、余额与 allowance 后才调用广播。当前执行测试使用确定性测试密钥、mock broadcaster 或显式零广播。MCP 没有内置钱包连接器，SDK 钱包界面由集成应用负责。 | **防护代码存在；真实钱包签名与真实广播未验证。** |
| 成交状态和余额核对 | 有广播订单状态、交易详情和钱包持仓的独立读取接口；没有一个已验证的流程把订单/交易最终状态与交易前后输入币及股票代币余额变化关联核对。 | **读取能力存在；成交最终性与交易后对账未验证。** |

历史 Live `test:mcp` 使用零地址，`amountDecimals` 由调用者提供，并且没有传入确认所需的 `maxGasCostBnb`。旧结果中的余额 0 和 allowance 不足来自零地址测试对象，不能据此推断真实钱包余额；其中“Unknown 市场状态阻断”也已确认为代码把类别和 `openState` 信号混为一谈，并已修复：类别仍为 Unknown，只有明确 `openState: true` 才满足该项可交易性检查。新分支经本地测试和 Live MCP 显式检查共同验证；Live 计划仍因零地址余额与 allowance 不足而失败，没有到 `awaiting_confirmation`。MCP 交易工具仍要求调用者自行提供输入币合约和精度；Ariadne 当前没有把自然语言中的“10 USDT/USDC”解析并核验为链、代币合约与 decimals 的完整路径。**因此，按“用户研究→用真实钱包买入→确认成交→核对股票和稳定币余额”的标准，真实资金闭环尚未证明可行；当前 Live 可执行计划也尚未验证。**

## 当前实现补充（2026-10-07）

产品 owner 明确了资金决策边界：Ariadne 不替用户判断其 USDT 或原生币是否够支付订单。当前代码不在计划生成、授权计划或购买钱包交接前读取并比较可用余额；交易费上限仍作为交易本身的风险限制进行核验，ERC-20 allowance 仍作为单独的花费授权条件核验。成交后的余额快照仅用于证明结算结果，不作为购买资格门槛。

提供方若只报告“余额或网络费不足”，Ariadne 保留 `simulation.success=false`，显示明确警告并允许用户把精确请求交给钱包；不把这类结果谎报成模拟通过。非余额类模拟失败仍阻断。确定性测试覆盖零输入余额下创建计划、余额类模拟警告后打开钱包页，以及单独 allowance 步骤的同类警告处理；这些是本地夹具证据，不是 Codex 实际钱包弹窗或真实交易证据。后续实时只读探测通过 Binance Web3 API 成功取得单一路由报价、构造交易并估算 gas；用合成地址请求提供方模拟后，得到 `BEP20: transfer amount exceeds balance`，系统将其归类为 funds-only warning 并允许进入 wallet review，模拟仍明确为失败。这不是用户钱包的余额结论或模拟通过证明。BSC RPC 的独立链上读取仍在 TLS 连接处被重置，因此本轮没有新的链上状态、真实宿主弹窗、签名/广播或成交对账证据。

本次复核重新运行了 `test:mcp`、`test:guarded-sdk-executor`、`test:execution-dry-run`、`test:mcp-human-confirmation` 和 `audit:experiments`。Live MCP 输出现在明确显示本次计划 `failed` 及其阻断原因，不再将收到响应写作计划成功。其余本地 mock/合成状态机测试均报告零真实网络广播；实验审计记录 10 次标准报价与 10 次 RFQ 报价、0 条广播记录。它们不替代真实钱包和链上成交验证。

## 已识别的体验限制

1. 上游目录返回量与平台统计存在未解释差异；目前不能向用户暗示完整资产宇宙。
2. 行情时间戳有来源意义，但没有已验证的新鲜度承诺。短时样本不能代表未来延迟。
3. 不支持 MCP Apps 的宿主不会展示卡片；第三方宿主的工具自动选择和渲染质量不同。
4. Agent 的最终解释和呈现由宿主控制，Ariadne 不能保证模型总能准确解读每种提示。
5. 本地模拟通过不等于真实资金执行成功。2026-10-09 已有一笔 bStocks NVDAB 创始人真实资金交易和钱包资产显示证据；Ondo/RFQ、其他资产与钱包环境，以及新版 Agent 自动登记和主动终局报告的宿主实测仍未验证。

## 评估结论

Ariadne 的体验差异点不是一个孤立的“聊天机器人”或通用行情表，而是将发行方/表示身份、市场上下文、来源与不确定性、安全阶段和宿主原生呈现结合起来。下一步评估应继续以实际 Agent 往返、MCP App 宿主差异、SDK 集成者任务和明确的数据边界为对象；不应用一份本地截图或单次成功调用代表所有用户环境。

## 创始人真实资金购买体验（2026-10-09）

owner 在当前 Codex + 外部 Edge + MetaMask 环境中亲自走完了以下路径：研究和比较 BSC 上的 NVDA 表示，明确选择 bStocks `NVDAB`，创建 7 USDT 购买计划，通过 Agent 返回的外部浏览器链接进入购买复核页，页面主动唤起 MetaMask，owner 核对并确认交易，随后在 BscScan 查看主购买交易并在 MetaMask 导入 NVDAB。

主购买交易是 [`0xfecb1e0eaa526d9dbc845c7c964307200d8fa38e47e4dd5e34aa8c89c95c7cd6`](https://bscscan.com/tx/0xfecb1e0eaa526d9dbc845c7c964307200d8fa38e47e4dd5e34aa8c89c95c7cd6)，链上状态成功，实际到账 `0.029960179248028382 NVDAB`。MetaMask Gas Station 的 `0x32222508cf321b61727b569e16ad4077be550890e943910e6ca95f6ff0b41764` 是辅助交易，不能作为购买主体展示。owner 指定的 MetaMask 与 BscScan 截图保存在本地工作流档案中，未纳入公开仓库。

这次体验证明了当前受测 bStocks NVDAB 路线能够从自然语言研究推进到 owner 钱包确认和链上到账。它不证明 Ondo 或其他股票已经过真实资金购买测试；BSC 研究范围仍同时包含 bStocks 与 Ondo。该次广播没有触发 Agent 主动终局报告；购买计划现已接入同一 handoff 的后台监听、精确核验与去重消息回报，等待下一次 owner 真实购买验证宿主闭环。

为减少交易完成后的不确定感，购买页在拿到有效交易哈希后提供两个与本次资产动态绑定的动作：一是打开该笔**主购买交易**的 BscScan 页面；二是用该计划中已验证的输出代币合约、符号、精度与可用官方图标调用 MetaMask `wallet_watchAsset`。该实现不按 `NVDAB` 或 bStocks 写死，因此由受支持计划提供的元数据可同样用于 bStocks 与 Ondo；这项代码适配不等于 Ondo 已完成真实资金验证。添加代币只改变钱包显示，不会再次发起购买。
