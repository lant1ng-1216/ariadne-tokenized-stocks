"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";
import { BrandMark } from "./brand-mark";
import { copyText } from "./copy-text";
import { HeroBackground } from "./hero-background";

const commands = {
  MCP: "npx -y ariadne-tokenized-stocks-mcp@0.1.0",
  SDK: "npm install ariadne-tokenized-stocks@0.1.0",
} as const;

type Surface = keyof typeof commands;

export function Hero() {
  const [surface, setSurface] = useState<Surface>("MCP");
  const [copied, setCopied] = useState(false);
  const command = commands[surface];

  async function copyCommand() {
    const success = await copyText(command);
    setCopied(success);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <section className="hero" id="top">
    <HeroBackground />
    <motion.div className="hero-content" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease: [0.22, 1, 0.36, 1] }}>
      <div className="status-pill"><Image src="/brand/bnb-chain-symbol-yellow.svg" alt="" width={20} height={20} unoptimized /><span>BNB SMART CHAIN</span><i /><span>TOKENIZED STOCKS</span></div>
      <h1>Connect your agent<br />to <span>tokenized stocks.</span></h1>
      <p className="hero-subtitle">Explore on-chain stock representations, compare issuer data, and prepare user-reviewed purchases on BNB Chain.</p>
      <div className="hero-install">
        <div className="install-intro">
          <span>{surface === "MCP" ? "Give this to your agent" : "Add the SDK to your app"}</span>
          <div className="surface-toggle" role="group" aria-label="Choose integration type">
            {(["MCP", "SDK"] as const).map((name) => <button key={name} type="button" aria-pressed={surface === name} onClick={() => { setSurface(name); setCopied(false); }}>{name}</button>)}
          </div>
        </div>
        <div className="hero-command">
          <code title={command}><span aria-hidden="true">$</span> {command}</code>
          <button type="button" onClick={copyCommand} aria-label={`Copy ${surface} command`}>{copied ? "Copied" : "Copy"}</button>
        </div>
        <p className="install-note" aria-live="polite">{copied ? "Copied to clipboard" : surface === "MCP" ? "Local stdio MCP · Live or Demo" : "TypeScript SDK · Live API · server-side credentials"}</p>
      </div>
      <div className="hero-signature" aria-label="Ariadne brand mark">
        <span className="signature-thread" />
        <BrandMark size={70} animated />
        <span className="hero-brand-label">ARIADNE <i>·</i> BUILT ON BNB CHAIN</span>
      </div>
    </motion.div>
    <div className="hero-bottomline"><span>Research <i>↗</i> Compare <i>↗</i> Prepare <i>↗</i> Confirm</span><span>Open source · MCP + SDK</span></div>
  </section>;
}
