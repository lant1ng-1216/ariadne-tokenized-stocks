"use client";

import { useState } from "react";
import { copyText } from "./copy-text";

const examples = {
  MCP: {
    file: "agent-config.json",
    package: "https://www.npmjs.com/package/ariadne-tokenized-stocks-mcp",
    language: "JSON",
    code: `{
  "mcpServers": {
    "ariadne-tokenized-stocks": {
      "command": "npx",
      "args": ["-y", "ariadne-tokenized-stocks-mcp@0.1.0"],
      "env": { "ARIADNE_MODE": "demo" }
    }
  }
}`,
  },
  SDK: {
    file: "research.ts",
    package: "https://www.npmjs.com/package/ariadne-tokenized-stocks",
    language: "TYPESCRIPT",
    code: `import { BinanceWeb3Client, TokenizedStocksService } from "ariadne-tokenized-stocks";

const client = new BinanceWeb3Client({
  apiKey: process.env.BINANCE_WEB3_API_KEY!,
  apiSecret: process.env.BINANCE_WEB3_API_SECRET!,
});

const stocks = new TokenizedStocksService(client);
const assets = await stocks.search("NVDA", { chainId: "56" });`,
  },
} as const;

type Integration = keyof typeof examples;
const tokenPattern = /(\/(?:\/).*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:import|from|const|new|await|process|env|true|false)\b|\b\d+\b|[{}[\](),.:;])/g;

function colorizeLine(line: string) {
  return line.split(tokenPattern).filter((part) => part !== undefined && part !== "").map((part, index) => {
    let className = "";
    if (part.startsWith("//")) className = "code-token-comment";
    else if (part.startsWith('"') || part.startsWith("'")) className = "code-token-string";
    else if (/^(import|from|const|new|await|process|env|true|false)$/.test(part)) className = "code-token-keyword";
    else if (/^\d+$/.test(part)) className = "code-token-number";
    else if (/^[{}[\](),.:;]$/.test(part)) className = "code-token-punctuation";
    return className ? <span className={className} key={index}>{part}</span> : part;
  });
}

export function DeveloperStage() {
  const [active, setActive] = useState<Integration>("MCP");
  const [copied, setCopied] = useState(false);
  const example = examples[active];

  async function copyExample() {
    const success = await copyText(example.code);
    setCopied(success);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return <section className="developer-stage section-shell" id="developers" aria-labelledby="developer-title">
    <div className="developer-intro">
      <p className="eyebrow">For agent builders</p>
      <h2 id="developer-title">Built for<br /><span>market agents.</span></h2>
      <p className="developer-lede">Start with the local MCP server inside your agent host, or import the TypeScript SDK into your own application. Use the surface that fits the product you are making.</p>
      <div className="integration-types"><span><b>MCP</b> agent-native</span><span><b>SDK</b> app-native</span><span><b>Demo</b> start locally</span></div>
      <div className="developer-links">
        <a href="https://www.npmjs.com/package/ariadne-tokenized-stocks-mcp" target="_blank" rel="noreferrer">MCP package</a>
        <a href="https://www.npmjs.com/package/ariadne-tokenized-stocks" target="_blank" rel="noreferrer">SDK package</a>
      </div>
    </div>
    <div className="developer-terminal">
      <div className="terminal-topbar">
        <div className="terminal-controls" aria-hidden="true"><i /><i /><i /></div>
        <span>ARIADNE / {example.file}</span>
        <button type="button" onClick={copyExample} aria-label={`Copy ${active} example`}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <div className="terminal-tabs" role="tablist" aria-label="Choose MCP or SDK example">
        {(["MCP", "SDK"] as const).map((name) => <button type="button" key={name} role="tab" aria-selected={active === name} onClick={() => { setActive(name); setCopied(false); }}>{name}</button>)}
      </div>
      <pre aria-label={`${active} integration example`}><code>{example.code.split("\n").map((line, index) => <span className="code-line" key={index}><span className="code-line-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{line ? colorizeLine(line) : " "}</span></span>)}</code></pre>
      <div className="terminal-foot"><span>{example.language} · {example.file}</span><span>{active === "MCP" ? "LOCAL STDIO · DEMO READY" : "TYPED CLIENT · SERVER SIDE"}</span></div>
    </div>
  </section>;
}
