import { BrandMark } from "./brand-mark";

const transaction = "https://bscscan.com/tx/0xfecb1e0eaa526d9dbc845c7c964307200d8fa38e47e4dd5e34aa8c89c95c7cd6";

export function Footer() {
  return <>
    <section className="closing-story" id="product" aria-labelledby="closing-title">
      <div className="closing-inner section-shell">
        <div className="closing-overline">ARIADNE <span>·</span> BUILT ON BNB CHAIN</div>
        <div className="closing-grid">
          <div className="closing-main">
            <p className="closing-kicker">The final decision stays yours</p>
            <h2 id="closing-title">Research with<br /><span>intent.</span></h2>
            <p className="closing-lede">Ariadne brings issuer-aware stock research and a reviewable purchase path into the tools developers already use. Your agent prepares the context; you stay in control of the wallet decision.</p>
            <a className="closing-proof" href={transaction} target="_blank" rel="noreferrer">View the BNB Chain pilot <span>↗</span></a>
          </div>
          <div className="closing-side">
            <p className="closing-side-label">A clearer path to tokenized stocks</p>
            <p className="closing-statement">Understand the issuer.<br />Compare the representation.<br /><strong>Make the call with context.</strong></p>
          </div>
        </div>
      </div>
    </section>
    <footer className="site-footer" aria-label="Ariadne footer">
      <div className="site-footer-shell section-shell">
        <div className="site-footer-top">
          <div className="site-footer-about">
            <a className="site-footer-brand" href="#top" aria-label="Ariadne, back to top">
              <span className="site-footer-mark"><BrandMark size={38} /></span>
              <span>Ariadne</span>
            </a>
            <p>Issuer-aware stock research and user-controlled purchase preparation for tokenized stocks on BNB Chain.</p>
            <div className="site-footer-legal"><span>© 2026 Ariadne</span><span>Open source · MIT License</span></div>
          </div>
          <nav className="site-footer-nav" aria-label="Footer navigation">
            <div className="site-footer-column">
              <h3>Product</h3>
              <a href="#product">Overview</a>
              <a href="#developers">Integrations</a>
              <a href={transaction} target="_blank" rel="noreferrer">BNB Chain pilot</a>
            </div>
            <div className="site-footer-column">
              <h3>Resources</h3>
              <a href="https://github.com/lant1ng-1216/ariadne-tokenized-stocks/blob/main/README.md" target="_blank" rel="noreferrer">README</a>
              <a href="https://github.com/lant1ng-1216/ariadne-tokenized-stocks/blob/main/docs/QUICKSTART.md" target="_blank" rel="noreferrer">Quickstart</a>
              <a href="https://github.com/lant1ng-1216/ariadne-tokenized-stocks/blob/main/docs/DEVELOPER_EXPERIENCE_REPORT.md" target="_blank" rel="noreferrer">Developer report</a>
            </div>
            <div className="site-footer-column">
              <h3>Project</h3>
              <a href="https://github.com/lant1ng-1216/ariadne-tokenized-stocks" target="_blank" rel="noreferrer">GitHub repository</a>
              <a href="https://www.npmjs.com/package/ariadne-tokenized-stocks" target="_blank" rel="noreferrer">TypeScript SDK</a>
              <a href="https://www.npmjs.com/package/ariadne-tokenized-stocks-mcp" target="_blank" rel="noreferrer">MCP server</a>
              <a href="https://github.com/lant1ng-1216/ariadne-tokenized-stocks/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a>
            </div>
          </nav>
        </div>
        <div className="site-footer-wordmark" aria-hidden="true">Ariadne<span>.</span></div>
        <div className="site-footer-base"><span>BNB CHAIN · TOKENIZED STOCKS</span><span>RESEARCH · COMPARE · PREPARE · CONFIRM</span></div>
      </div>
    </footer>
  </>;
}
