"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSite } from "./site";
import s from "./connected-story.module.css";

export function ConnectedStory() {
  const { t, href } = useSite();
  const root = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState(0);
  const [focus, setFocus] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const market = document.getElementById("market");
    const sections = [market, ...el.querySelectorAll<HTMLElement>("[data-scene]")].filter((section): section is HTMLElement => section !== null);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      // One viewport guide for every segment: the preceding path finishes
      // exactly when the next path begins. Scroll position, not elapsed time,
      // controls the line in both directions.
      const guideY = innerHeight * .62;
      const maxScroll = document.documentElement.scrollHeight - innerHeight;
      for (const section of sections) {
        const box = section.getBoundingClientRect();
        // The final section has less scroll room because the footer is short.
        // Keep its entry synchronized, but finish the path at the real page end.
        const startScroll = scrollY + box.top - guideY;
        const travel = section.classList.contains(s.closing)
          ? Math.max(1, Math.min(box.height, maxScroll - startScroll))
          : box.height;
        const progress = motion.matches ? 1 : Math.max(0, Math.min(1, (guideY - box.top) / travel));
        section.style.setProperty("--progress", String(progress));
        section.querySelectorAll<SVGPathElement>(".market-thread-ink, [data-thread-ink]").forEach(ink => {
          const head = section.querySelector<HTMLElement>("[data-thread-head]");
          if (!head) return;
          if (!motion.matches && progress > 0 && progress < 1) {
            const point = ink.getPointAtLength(ink.getTotalLength() * progress);
            const matrix = ink.getScreenCTM();
            if (!matrix) return;
            const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
            head.style.left = `${screen.x - box.left}px`;
            head.style.top = `${screen.y - box.top}px`;
            head.style.opacity = "1";
          } else head.style.opacity = "0";
        });
        section.dataset.trace = progress >= (section === market ? .55 : section.classList.contains(s.context) ? .42 : .48) ? "on" : "off";
        section.querySelectorAll<HTMLElement>("[data-trace-at]").forEach(target => {
          target.dataset.traced = String(progress >= Number(target.dataset.traceAt));
        });
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); motion.removeEventListener("change", schedule); };
  }, []);
  const labels = [t("Individuals", "个人用户", "개인"), t("Developers", "开发者", "개발자"), t("Agents", "Agent", "에이전트"), t("Institutions", "机构与研究人员", "기관 및 연구자")];
  const notes = [t("Read the issuer, not just the ticker. Different representations keep their own identity.", "不止看代码，也看发行方。不同链上表示，保留各自的身份。", "코드뿐 아니라 발행사도 확인하세요. 각 표현의 식별 정보를 보존합니다."), t("A price needs a reference. Market conditions remain part of the comparison.", "价格需要参照。市场条件，是比较的一部分。", "가격에는 기준이 필요합니다. 시장 조건도 함께 비교합니다."), t("Keep the source and the time. Missing information stays unknown, never zero.", "保留来源和时间。缺失信息保持未知，不被当作零。", "출처와 시간을 보존합니다. 누락 정보는 0이 아닌 알 수 없음입니다.")];
  return <div ref={root} className={s.story}>
    <section data-scene className={`shell ${s.context}`} aria-labelledby="woven-title">
      <Thread path="M664 0 C664 85 760 105 785 170 S865 215 835 290 C800 340 910 355 845 425 S800 500 870 545 C910 615 685 625 664 760" />
      <header className={s.heading}><span className="eyebrow">02 / CONTEXT, CONNECTED</span><h2 id="woven-title">{t("Clarity, woven.", "让信息，连成理解。", "맥락을 엮다.")}</h2><p>{t("Follow the facts. Preserve the differences.", "连接事实，保留差异。", "사실을 연결하고 차이를 보존합니다.")}</p></header>
      <div className={s.composition}>
        <button data-trace-at=".25" className={`${s.issuer} ${focus === 0 ? s.active : ""}`} onClick={() => setFocus(0)} aria-pressed={focus === 0}><small>ISSUER / 01</small><strong>{t("Distinct\nrepresentations.", "不同表示，\n各有身份。", "고유한\n온체인 표현.")}</strong><span>↗</span></button>
        <button data-trace-at=".35" className={`${s.source} ${focus === 2 ? s.active : ""}`} onClick={() => setFocus(2)} aria-pressed={focus === 2}><small>ARIADNE / MARKET CONTEXT</small><div><small>SOURCE</small><strong>{t("Provenance retained.", "来源，可追溯。", "출처를 보존하다.")}</strong></div></button>
        <button data-trace-at=".51" className={`${s.reference} ${focus === 1 ? s.active : ""}`} onClick={() => setFocus(1)} aria-pressed={focus === 1}><small>REFERENCE / 02</small><strong>{t("Price in context.", "价格，置于语境。", "맥락 속의 가격.")}</strong><div className={s.scale} aria-hidden="true"><i/><i/><span>REFERENCE</span><span>REPRESENTATION</span></div><div className={s.condition}><small>MARKET STATE</small><span>{t("Conditions matter.", "条件，同样重要。", "조건도 중요합니다.")}</span></div></button>
        <button data-trace-at=".73" className={`${s.gap} ${focus === 2 ? s.active : ""}`} onClick={() => setFocus(2)} aria-pressed={focus === 2}><small>DATA GAP / 03</small><strong>{t("Unknown, not zero.", "未知，不是零。", "알 수 없음은 0이 아닙니다.")}</strong><div className={s.dotted}/><small>TIMESTAMP</small><span>{t("Snapshot, not live.", "快照，非实时行情。", "실시간이 아닌 스냅샷.")}</span></button>
      </div>
      <div className={s.contextFoot}><div className={s.steps} aria-label={t("Information focus", "信息维度", "정보 초점")}>{["IDENTITY", "CONTEXT", "EVIDENCE"].map((name, i) => <button key={name} onClick={() => setFocus(i)} aria-pressed={focus === i}>0{i + 1}<span>{name}</span></button>)}</div><p aria-live="polite">{notes[focus]}</p></div>
    </section>

    <section data-scene className={`shell ${s.interfaces}`} aria-labelledby="interfaces-title">
      <Thread path="M664 0 C660 65 520 100 540 185 C555 255 800 265 830 350 S730 590 664 760" />
      <header className={s.heading}><span className="eyebrow">03 / ONE LAYER. MANY POSSIBILITIES.</span><h2 id="interfaces-title">{t("One thread. Your way in.", "同一条线，不同的可能。", "하나의 실, 당신의 방식.")}</h2><p>{t("For the way you research, build and connect.", "连接你的研究、构建与使用方式。", "리서치, 구축, 연결을 위한 기반.")}</p></header>
      <div className={s.portal}>
        <div className={s.roleMenu} role="group" aria-label={t("Choose an interface", "选择使用方式", "인터페이스 선택")}>{labels.map((label, i) => <button key={label} aria-pressed={role === i} aria-controls="connected-interface" onClick={() => setRole(i)}><small>0{i + 1}</small><span>{label}</span><b>↗</b></button>)}</div>
        <div className={s.surface} id="connected-interface" aria-live="polite"><div className={s.surfaceTop}><span>ARIADNE / {["EXPLORE", "BUILD", "CONNECT", "RESEARCH"][role]}</span><span>{t("CAPABILITY PREVIEW", "能力示意", "기능 예시")}</span></div>
          <div key={role} className={s.roleContent}>
            {role === 0 ? <><h3>{t("A clearer point of view.", "从看清，到理解。", "더 선명한 관점.")}</h3><div className={s.researchFlow}><span>01 <b>{t("Discover", "发现资产", "탐색")}</b></span><span>02 <b>{t("Compare", "比较表示", "비교")}</b></span><span>03 <b>{t("Understand", "理解差异", "이해")}</b></span></div><p>{t("Explore the market by company. Compare issuer representations with their context intact.", "从公司出发探索市场，在完整语境中比较不同发行方的链上表示。", "기업별로 시장을 탐색하고 발행사별 표현을 맥락과 함께 비교하세요.")}</p></> : role === 1 ? <><h3>{t("Your interface. Our foundation.", "你的界面，共享底座。", "당신의 인터페이스, 우리의 기반.")}</h3><div className={s.code}><span>// INTEGRATION MODEL · NOT EXECUTABLE</span><code>application<br/>  ↳ TypeScript SDK<br/>     ↳ identity · context · evidence</code></div><p>{t("Bring structured market capabilities into your own products and workflows.", "把结构化的市场能力，接入你的产品与工作流。", "구조화된 시장 기능을 제품과 워크플로에 연결하세요.")}</p></> : role === 2 ? <><h3>{t("Extend the agent you trust.", "让熟悉的 Agent，连接市场。", "익숙한 에이전트를 확장하세요.")}</h3><div className={s.agent}><span>{t("Understand the differences between issuers.", "帮我理解不同发行方之间的差异。", "발행사별 차이를 알려 주세요.")}</span><div><small>MCP → ARIADNE</small><b>Identity + Context + Evidence</b></div></div><p>{t("A market connection for your existing assistant. Research is not authorization to trade.", "为现有助手接入市场能力。研究请求不等于交易授权。", "기존 어시스턴트에 시장을 연결합니다. 리서치는 거래 승인이 아닙니다.")}</p></> : <><h3>{t("Keep the evidence in view.", "每一份判断，都有依据。", "근거를 시야에 두세요.")}</h3><div className={s.ledger}>{[t("Issuer identity", "发行方身份", "발행사 식별"), t("Source provenance", "来源记录", "출처 기록"), t("Data gaps", "数据缺口", "데이터 공백")].map((v, i) => <div key={v}><span>0{i + 1} / {v}</span><b>{["PRESERVED", "TRACEABLE", "EXPLICIT"][i]}</b></div>)}</div><p>{t("A consistent information layer for research teams and institutional workflows.", "为研究团队与机构工作流，提供一致的市场信息层。", "리서치 팀과 기관 워크플로를 위한 일관된 정보 계층.")}</p></>}
            <Link href={href(role === 0 || role === 3 ? "/assets" : "/developers")} className={s.action}>{role === 0 || role === 3 ? t("Explore assets", "探索资产", "자산 탐색") : t("Build with Ariadne", "通过 Ariadne 构建", "Ariadne로 구축하기")} <span>↗</span></Link>
          </div>
        </div>
      </div>
    </section>

    <section data-scene className={`shell ${s.closing}`} aria-labelledby="thread-title">
      <Thread path="M664 0 C635 100 930 90 970 190 C1030 335 780 365 755 265 C735 190 875 160 865 250 C855 355 650 370 410 370" />
      <div className={s.signature} aria-hidden="true">Ariadne<span>THE CONNECTIVE LAYER</span></div>
      <div className={s.closingCopy}><span className="eyebrow">04 / KEEP THE THREAD</span><h2 id="thread-title">{t("Find your thread.", "找到你的那条线。", "당신의 실을 찾으세요.")}</h2><p>{t("From market understanding to what you build next.", "从理解市场，到构建下一种可能。", "시장의 이해에서 다음 가능성까지.")}</p><div><Link className="button primary" href={href("/assets")}>{t("Explore assets", "探索资产", "자산 탐색")}<span>↗</span></Link><Link className={s.action} href={href("/developers")}>{t("Build with Ariadne", "通过 Ariadne 构建", "Ariadne로 구축하기")}<span>↗</span></Link></div></div>
    </section>
  </div>;
}

function Thread({ path }: { path: string }) {
  return <><svg className={s.thread} viewBox="0 0 1440 760" preserveAspectRatio="none" aria-hidden="true"><path className={s.threadBase} d={path}/><path data-thread-ink className={s.threadInk} pathLength="1" d={path}/></svg><span data-thread-head className={s.threadHead} aria-hidden="true"><Image src="/brand/ariadne-relief.png" alt="" width={64} height={64}/></span></>;
}
