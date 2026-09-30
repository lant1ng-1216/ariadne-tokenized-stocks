"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";
import { copy, type Language } from "./copy";
import { Site, useSite } from "./site";
import { HomeSections } from "./home-sections";
export function Mark({ mark }: {
    mark: string;
}) { if (mark === "microsoft")
    return <span className="company-mark microsoft" aria-hidden="true"><i /><i /><i /><i /></span>; return <span aria-hidden="true" className={`company-mark ${mark}`} style={{ maskImage: `url(/companies/${mark}.svg)`, WebkitMaskImage: `url(/companies/${mark}.svg)` }}/>; }
function Arrow() { return <svg className="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.3"/></svg>; }
export default function Home({ initialLanguage }: {
    initialLanguage: Language;
}) { return <Site initialLanguage={initialLanguage}><Content /></Site>; }
function Content() {
    const { lang, href, t } = useSite(), text = copy[lang];
    const [replay, setReplay] = useState(0);
    const [threadReplay, setThreadReplay] = useState(0);
    const sculpture = useRef<HTMLButtonElement>(null);
    function moveLogo(e: PointerEvent<HTMLButtonElement>) { if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches)
        return; const b = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - b.left) / b.width * 2 - 1, y = (e.clientY - b.top) / b.height * 2 - 1; sculpture.current?.style.setProperty("--rx", `${-y * 6}deg`); sculpture.current?.style.setProperty("--ry", `${x * 8}deg`); sculpture.current?.style.setProperty("--tx", `${x * 5}px`); sculpture.current?.style.setProperty("--ty", `${y * 3}px`); }
    function resetLogo() { for (const p of ["--rx", "--ry", "--tx", "--ty"])
        sculpture.current?.style.removeProperty(p); }
    function replayLogo() {
        setReplay(v => v + 1);
        const marketProgress = Number(document.getElementById("market")?.style.getPropertyValue("--progress") || 0);
        if (marketProgress === 0) setThreadReplay(v => v + 1);
    }
    return <main id="main">
 <section className="hero shell" aria-labelledby="brand-title"><div className="hero-copy"><h1 id="brand-title">Ariadne</h1><h2 className="hero-headline"><span>{text.headline[0]}</span><span>{text.headline[1]}</span></h2><p className="hero-description">{text.description.map(line => <span key={line}>{line}</span>)}</p><div className="hero-actions"><Link href={href("/assets")} className="button primary">{text.explore}<Arrow /></Link><Link href={href("/developers")} className="button secondary">{text.build}<Arrow /></Link></div></div><div className="hero-art"><button ref={sculpture} className="sculpture" onPointerMove={moveLogo} onPointerLeave={resetLogo} onBlur={resetLogo} onClick={replayLogo} aria-label={text.replay}><div key={replay} className="sculpture-reveal"><Image src="/brand/ariadne-relief.png" width={1254} height={1254} alt="" priority sizes="(max-width: 680px) 85vw, (max-width: 1020px) 48vw, 660px"/></div></button><span className="art-caption"><span />{text.turn}</span></div><svg key={threadReplay} className="hero-thread" viewBox="0 0 1440 780" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="thread-ink" x1="0" x2="1"><stop offset="0" stopColor="#953129" stopOpacity=".65"/><stop offset=".32" stopColor="#cf4933"/><stop offset=".8" stopColor="#f05e40"/><stop offset="1" stopColor="#ab3828"/></linearGradient></defs><path className="thread-track" d="M1160 538 C1240 538 1375 522 1375 623 C1375 703 1320 711 1255 711 L0 711 V780"/><path className="thread-draw" pathLength="1" d="M1160 538 C1240 538 1375 522 1375 623 C1375 703 1320 711 1255 711 L0 711 V780"/></svg><a className="hero-scroll-cue" href="#market"><span className="hero-scroll-cue-line"/><span>{t("FOLLOW THE THREAD", "沿线继续", "실을 따라가기")}</span><span aria-hidden="true">↓</span></a></section>
 <HomeSections Mark={Mark} />
 </main>;
}
