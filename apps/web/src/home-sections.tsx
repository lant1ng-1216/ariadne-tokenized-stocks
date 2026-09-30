import Link from "next/link";
import Image from "next/image";
import { useState, type ComponentType } from "react";
import { companies, copy } from "./copy";
import { useSite } from "./site";
import { ConnectedStory } from "./connected-story";
import s from "./home-sections.module.css";

export function HomeSections({ Mark }: { Mark: ComponentType<{ mark: string }> }) {
  const { lang, href, t } = useSite();
  const text = copy[lang];
  const [selected, setSelected] = useState(0);
  const company = companies[selected];
  return <>
    <section id="market" className={`market shell ${s.market}`} aria-labelledby="market-title">
      <svg className="market-thread" viewBox="0 0 1440 380" preserveAspectRatio="none" aria-hidden="true"><path className="market-thread-guide" d="M0 0 C0 34 24 55 72 55 H400 C465 55 450 90 538 112 S664 145 664 195 V380" /><path className="market-thread-ink" pathLength="1" d="M0 0 C0 34 24 55 72 55 H400 C465 55 450 90 538 112 S664 145 664 195 V380" /></svg><span data-thread-head className="market-thread-head" aria-hidden="true"><Image src="/brand/ariadne-relief.png" alt="" width={64} height={64}/></span>
      <div className="market-intro"><span className="eyebrow">{text.marketLabel}</span><h2 id="market-title">{text.marketTitle.map(line => <span key={line}>{line}</span>)}</h2><p>{text.marketDescription}</p><p className={s.marketExplanation}>{t("Shared underlying. Distinct issuers, tokens and market conditions.", "同一底层公司，不同发行方、代币与市场条件。", "같은 기초 기업. 서로 다른 발행사, 토큰, 시장 조건.")}</p><Link className={s.inlineLink} href={href(`/assets/${company.ticker}`)}>{t("Explore", "查看", "살펴보기")} {company.ticker} <span>↗</span></Link></div>
      <div className="market-companies"><div className="company-list" role="group" aria-label={text.assets}>{companies.map((c, i) => <button className="company" key={c.ticker} aria-pressed={selected === i} aria-controls="company-detail" onClick={() => setSelected(i)}><span className="company-heading"><Mark mark={c.mark}/><span>{c.name}</span></span><span className="company-meta">{c.ticker}<span>↗</span></span></button>)}</div>
        <div id="company-detail" className="company-detail" aria-live="polite" aria-atomic="true"><div className="detail-title"><span>{company.ticker}</span><span className="detail-caption">{company.representations.length} {t(company.representations.length === 1 ? "representation" : "representations", "种链上表示", "개의 온체인 표현")}</span></div><div className="representation-list">{company.representations.map(r => <div className="representation" key={r.symbol}><span className="issuer-dot"/><span><small>{text.issuer}</small>{r.issuer}</span><span><small>{text.representation}</small><strong>{r.symbol}</strong></span><span className="chain"><small>{text.chain}</small>BNB Chain</span></div>)}</div><span className={s.caption}>{text.example}</span></div>
      </div><p className="market-note">{text.note}</p>
    </section>

    <ConnectedStory />
  </>;
}
