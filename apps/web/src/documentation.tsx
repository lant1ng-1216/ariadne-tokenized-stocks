"use client";
import Link from "next/link";
import { useState } from "react";
import { docs, words } from "./docs-content";
import { CodeBlock, useSite } from "./site";
export default function Documentation({ slug = "start" }: {
    slug?: string;
}) {
    const { lang, href, t } = useSite();
    const [query, setQuery] = useState("");
    const index = docs.findIndex(d => d.slug === slug), doc = docs[index];
    const q = query.toLowerCase();
    const results = docs.filter(d => [d.slug, words(d.title, lang), words(d.description, lang), ...d.sections.flatMap(s => [words(s.title, lang), words(s.body, lang), s.id])].join(" ").toLowerCase().includes(q));
    if (!doc)
        return null;
    return <main id="main" className="docs-layout shell"><aside className="docs-sidebar"><Link className="docs-home" href={href("/docs")}>ARIADNE <span>{t("DOCS", "文档", "문서")}</span></Link><label className="docs-search"><span className="sr-only">{t("Search documentation", "搜索文档", "문서 검색")}</span><input type="search" placeholder={t("Search documentation…", "搜索文档…", "문서 검색…")} value={query} onChange={e => setQuery(e.target.value)}/></label><nav aria-label={t("Documentation chapters", "文档章节", "문서 장")}>{results.map(d => <Link key={d.slug} onClick={() => setQuery("")} aria-current={d.slug === slug ? "page" : undefined} href={href("/docs/" + d.slug)}>{words(d.title, lang)}<span>↗</span></Link>)}{!results.length && <p role="status">{t("No matching chapters.", "没有匹配的章节。", "일치하는 장이 없습니다.")}</p>}</nav><div className="docs-sidebar-note">SDK + MCP<br /><span>{t("Source-based integration", "基于源码接入", "소스 기반 연결")}</span></div></aside><article className="doc-article"><span className="eyebrow">{t("DOCUMENTATION", "开发文档", "문서")} / 0{index + 1}</span><h1>{words(doc.title, lang)}</h1><p className="doc-lead">{words(doc.description, lang)}</p><div className="doc-context">{t("Examples follow the current source implementation. Demo is not live market data.", "示例依据当前源码实现。Demo 不代表实时市场数据。", "예시는 현재 소스 구현을 따릅니다. 데모는 실시간 시장 데이터가 아닙니다.")}</div>{doc.sections.map(s => <section id={s.id} key={s.id}><h2><a href={"#" + s.id}>{words(s.title, lang)} <span>#</span></a></h2><p>{words(s.body, lang)}</p>{s.code && <CodeBlock code={s.code} label={s.label}/>}</section>)}<div className="doc-pagination">{index > 0 ? <Link href={href("/docs/" + docs[index - 1].slug)}>← {words(docs[index - 1].title, lang)}</Link> : <span />}{index + 1 < docs.length && <Link href={href("/docs/" + docs[index + 1].slug)}>{words(docs[index + 1].title, lang)} →</Link>}</div></article><aside className="doc-toc"><span className="eyebrow">{t("ON THIS PAGE", "本页目录", "이 페이지")}</span>{doc.sections.map(s => <a key={s.id} href={"#" + s.id}>{words(s.title, lang)}</a>)}<Link href={href("/developers")}>{t("Developer overview ↗", "开发者概览 ↗", "개발자 개요 ↗")}</Link></aside></main>;
}
