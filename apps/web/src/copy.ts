export type Language = "en" | "zh" | "ko";
export function language(value: unknown): Language | undefined {
  return value === "en" || value === "zh" || value === "ko" ? value : undefined;
}

export const copy = {
  en: {
    assets: "Assets", developers: "Developers", docs: "Docs", explore: "Explore assets", build: "For developers",
    skip: "Skip to content", menu: "Menu", close: "Close", locale: "Language",
    headline: ["Your way through", "onchain markets."],
    description: ["Discover tokenized equities. Compare issuers.", "Build through SDK and MCP."],
    marketLabel: "THE MARKET, CONNECTED", marketTitle: ["One company.", "Multiple representations."],
    marketDescription: "Start with the company. See the ways it exists onchain.",
    selected: "SELECTED UNDERLYING", issuer: "Issuer", representation: "Representation", chain: "Network",
    example: "Selected examples · not live market data", note: "Company marks identify underlying assets, not partnerships. Availability and eligibility depend on the issuer.",
    devLabel: "BUILD WITH ARIADNE", devTitle: "One market layer. Your interface.",
    devDescription: "Asset discovery, issuer comparison and market context — for your application, existing agents and institutional workflows.",
    sdk: "Integrate with your product", mcp: "Connect your existing agent",
    sdkDescription: "Use the TypeScript SDK to resolve assets and access structured market context. Not limited to AI agents.",
    mcpDescription: "Give an MCP-compatible client access to Ariadne's research and action-preparation tools. Signing remains external and requires user authorization.",
    repo: "View source & setup", prototype: "Developer-page preview. Full integration instructions are in the repository.",
    footer: "A shared interface to tokenized equities.", top: "Back to top", replay: "Replay brand motion", turn: "MOVE TO EXPLORE", preview: "LOCAL DESIGN PREVIEW",
  },
  zh: {
    assets: "资产", developers: "开发者", docs: "文档", explore: "探索资产", build: "为开发者构建",
    skip: "跳至正文", menu: "菜单", close: "关闭", locale: "语言",
    headline: ["循线而行，", "连接链上市场。"],
    description: ["发现代币化股票，比较不同发行方。", "通过 SDK 与 MCP 构建你的产品。"],
    marketLabel: "让市场，彼此连接", marketTitle: ["同一家公司，", "不止一种链上表示。"],
    marketDescription: "从公司出发，看见它在链上的不同表示。",
    selected: "当前底层资产", issuer: "发行方", representation: "链上表示", chain: "网络",
    example: "精选示例 · 非实时行情", note: "公司标识用于识别底层资产，不代表合作关系。可用性及准入条件以发行方为准。",
    devLabel: "通过 ARIADNE 构建", devTitle: "共享市场能力，构建你的入口。",
    devDescription: "资产发现、发行方比较与市场信息，为应用、现有 Agent 和机构工作流提供统一的交互基础。",
    sdk: "接入你的产品", mcp: "连接现有 Agent",
    sdkDescription: "通过 TypeScript SDK 解析资产、获取结构化市场信息。不局限于 AI Agent，可用于自己的应用与服务。",
    mcpDescription: "让支持 MCP 的客户端使用 Ariadne 的研究与交易准备工具。签名在外部完成，执行需要用户授权。",
    repo: "查看源码与接入说明", prototype: "开发者入口预览。完整接入说明见代码仓库。",
    footer: "代币化股票的共享交互入口。", top: "返回顶部", replay: "重播品牌动效", turn: "移动鼠标，感受细节", preview: "本地设计预览",
  },
  ko: {
    assets: "자산", developers: "개발자", docs: "문서", explore: "자산 둘러보기", build: "개발자 시작하기",
    skip: "본문으로 이동", menu: "메뉴", close: "닫기", locale: "언어",
    headline: ["온체인 시장으로", "이어지는 길."],
    description: ["토큰화 주식을 발견하고 발행사를 비교하세요.", "SDK와 MCP로 제품을 구축하세요."],
    marketLabel: "하나로 연결되는 시장", marketTitle: ["하나의 기업,", "다양한 온체인 표현."],
    marketDescription: "기업에서 시작해 다양한 온체인 자산을 살펴보세요.",
    selected: "선택한 기초 자산", issuer: "발행사", representation: "온체인 표현", chain: "네트워크",
    example: "선별된 예시 · 실시간 시세 아님", note: "기업 로고는 기초 자산을 나타내며 제휴를 의미하지 않습니다. 이용 가능 여부와 자격 조건은 발행사에 따라 다릅니다.",
    devLabel: "ARIADNE로 구축하기", devTitle: "하나의 시장 계층. 당신의 인터페이스.",
    devDescription: "자산 탐색, 발행사 비교, 시장 정보를 애플리케이션과 기존 에이전트, 기관 워크플로에 연결하세요.",
    sdk: "제품에 통합하기", mcp: "기존 에이전트 연결하기",
    sdkDescription: "TypeScript SDK로 자산을 식별하고 구조화된 시장 정보를 활용하세요. AI 에이전트뿐 아니라 앱과 서비스에도 사용할 수 있습니다.",
    mcpDescription: "MCP 호환 클라이언트에서 Ariadne의 리서치 및 거래 준비 도구를 사용하세요. 서명은 외부에서 진행되며 실행에는 사용자 승인이 필요합니다.",
    repo: "소스 및 설정 보기", prototype: "개발자 페이지 미리보기입니다. 전체 연결 안내는 저장소를 참고하세요.",
    footer: "토큰화 주식을 위한 통합 인터페이스.", top: "맨 위로", replay: "브랜드 모션 다시 보기", turn: "움직여서 살펴보기", preview: "로컬 디자인 미리보기",
  },
} as const;

// Curated marketing examples from the existing demo catalog, not live data.
export const companies = [
  { ticker: "NVDA", name: "NVIDIA", mark: "nvidia", representations: [{ issuer: "Ondo", symbol: "NVDAon" }, { issuer: "bStocks", symbol: "NVDAB" }] },
  { ticker: "AAPL", name: "Apple", mark: "apple", representations: [{ issuer: "Ondo", symbol: "AAPLon" }] },
  { ticker: "TSLA", name: "Tesla", mark: "tesla", representations: [{ issuer: "Ondo", symbol: "TSLAon" }, { issuer: "bStocks", symbol: "TSLAB" }] },
  { ticker: "MSFT", name: "Microsoft", mark: "microsoft", representations: [{ issuer: "Ondo", symbol: "MSFTon" }, { issuer: "bStocks", symbol: "MSFTB" }] },
] as const;
