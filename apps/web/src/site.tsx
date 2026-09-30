"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { copy, language, type Language } from "./copy";
const Context = createContext({ lang: "en" as Language, href: (path: string) => path, t: (en: string, zh: string, ko: string) => en });
export const useSite = () => useContext(Context);
function highlight(code: string) {
    const pattern = /(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:import|from|const|await|if|new|return)\b|\b\d+\b)/g;
    return code.split(pattern).map((token, i) => { const cls = token.startsWith("//") || token.startsWith("#") ? "syntax-comment" : token.startsWith('"') || token.startsWith("'") ? "syntax-string" : /^(import|from|const|await|if|new|return)$/.test(token) ? "syntax-keyword" : /^\d+$/.test(token) ? "syntax-number" : undefined; return <span className={cls} key={i}>{token}</span>; });
}
export function Site({ initialLanguage, children }: {
    initialLanguage: Language;
    children: ReactNode;
}) {
    const [lang, setLang] = useState(initialLanguage), [menu, setMenu] = useState(false);
    const path = usePathname();
    const text = copy[lang];
    const href = (p: string) => `${p}${p.includes("?") ? "&" : "?"}lang=${lang}`;
    const t = (en: string, zh: string, ko: string) => lang === "zh" ? zh : lang === "ko" ? ko : en;
    useEffect(() => { document.documentElement.lang = lang === "zh" ? "zh-CN" : lang; document.cookie = `ariadne-language=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`; }, [lang]);
    useEffect(() => { setLang(initialLanguage); setMenu(false); }, [initialLanguage, path]);
    useEffect(() => { const sync = () => setLang(language(new URLSearchParams(location.search).get("lang")) ?? initialLanguage); window.addEventListener("popstate", sync); return () => window.removeEventListener("popstate", sync); }, [initialLanguage]);
    useEffect(() => { const elements = document.querySelectorAll(".reveal"); const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
    } }), { threshold: .08 }); elements.forEach(e => observer.observe(e)); return () => observer.disconnect(); }, [path]);
    function change(value: string) { const next = language(value); if (!next)
        return; setLang(next); const url = new URL(location.href); url.searchParams.set("lang", next); history.replaceState(null, "", url); }
    const links = [["/assets", text.assets], ["/developers", text.developers], ["/docs", text.docs]];
    return <Context.Provider value={{ lang, href, t }}><div className="site" data-language={lang}>
    <a className="skip-link" href="#main">{text.skip}</a>
    <header className="header shell"><Link href={href("/")} className="brand" aria-label="Ariadne"><Image src="/brand/ariadne-relief.png" width={50} height={50} alt=""/><span>ARIADNE</span></Link>
      <nav className="desktop-nav" aria-label={t("Main navigation", "主导航", "주 탐색")}>{links.map(([url, label]) => <Link key={url} href={href(url)} aria-current={path.startsWith(url) ? "page" : undefined}>{label}</Link>)}</nav>
      <div className="header-actions"><label className="language"><span className="sr-only">{text.locale}</span><select value={lang} onChange={e => change(e.target.value)}><option value="en">EN</option><option value="zh">中文</option><option value="ko">한국어</option></select><svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5"/></svg></label><Link className="button primary nav-cta" href={href("/assets")}>{text.explore}</Link><button className="menu-toggle" aria-label={menu ? text.close : text.menu} aria-expanded={menu} aria-controls="mobile-nav" onClick={() => setMenu(!menu)}><span /><span /></button></div>
      {menu && <nav id="mobile-nav" className="mobile-nav">{links.map(([url, label]) => <Link key={url} onClick={() => setMenu(false)} href={href(url)}>{label}<span>↗</span></Link>)}</nav>}
    </header>{children}
    <footer className="footer shell"><Link className="footer-brand" href={href("/")}>Ariadne</Link><p>{text.footer}</p><div className="footer-links">{links.map(([url, label]) => <Link key={url} href={href(url)}>{label}</Link>)}<a href="https://github.com/lant1ng-1216/ariadne-tokenized-stocks" target="_blank" rel="noreferrer">GitHub ↗</a></div><span className="preview-label">{t("LOCAL PREVIEW · NO SIGNING OR BROADCAST", "本地预览 · 不签名、不广播", "로컬 미리보기 · 서명 및 브로드캐스트 없음")}</span></footer>
  </div></Context.Provider>;
}
export function CodeBlock({ code, label = "TypeScript" }: {
    code: string;
    label?: string;
}) {
    const { t } = useSite();
    const [status, setStatus] = useState(0);
    useEffect(() => { setStatus(0); }, [code]);
    return <div className="code-block"><div className="code-bar"><span>{label}</span><button onClick={async () => { try {
        await navigator.clipboard.writeText(code);
        setStatus(1);
    }
    catch {
        setStatus(2);
    } }}>{status === 1 ? t("Copied", "已复制", "복사됨") : status === 2 ? t("Select text to copy", "请选中文本复制", "텍스트를 선택해 복사") : t("Copy", "复制", "복사")}</button></div><pre><code>{highlight(code)}</code></pre></div>;
}
