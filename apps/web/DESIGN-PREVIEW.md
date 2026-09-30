# Ariadne brand-led website

## Scope

The approved hero remains intact. The homepage now contains a marketing relationship scene, an interactive research illustration, four audience perspectives and a closing call to action. Independent asset, developer and documentation pages share navigation, language preference and brand styling. This does not replace or modify the SDK, MCP tools, domain model, adapters, or execution services.

Homepage scenes use clearly labeled illustrative examples. The asset workspace consumes the existing read-only API instead. The old developer dialog and its obsolete component were removed and replaced by a dedicated page.

## Local preview

Run `npm --prefix apps/web run preview:local` from the repository root. It starts a detached, local-only Next.js development server at http://localhost:3000 and the existing read-only Demo API on port 18901. Logs and the website process ID are stored in `apps/web/.local/` and ignored by Git. Existing listeners are left untouched. No wallet, signing, broadcast or public tunnel is started. An explicit server-side `ARIADNE_API_ORIGIN` selects a different existing API; live credentials are never loaded by this preview launcher.

## Routes and data boundaries

- `/`: brand and marketing only.
- `/assets`: searchable directory, issuer filter, company/representation views and sorting.
- `/assets/[ticker]`: catalog evidence, issuer comparison and supplementary research when available.
- `/developers`: SDK and MCP in one dedicated page, with copyable code/configuration.
- `/docs` and `/docs/[slug]`: six locally maintained chapters, text search, syntax coloring, contents and adjacent-page navigation. Structured TypeScript content keeps translations and snippets together without introducing an MDX dependency.
- `/api/catalog` and `/api/asset-research`: GET-only proxies to fixed existing endpoints, with allowlisted query parameters, timeout and explicit failures. No silent Demo fallback.

Current local data is Demo, explicitly labeled, with 10 representations across 7 companies. Supplementary Demo research currently supports NVIDIA only; other details use catalog evidence and disclose the missing research coverage. This existing core limitation was not modified. Transactions are not exposed. No hosted API-key dashboard or published npm release is assumed.

## Visual assets

- `public/brand/ariadne-relief.png`: AI-generated transparent high-resolution relief derived from the user's Ariadne mark, with the user's approval. Used as a visual asset, not as a full-page screenshot.
- `public/brand/ariadne-flat.png` and `app/icon.png`: existing Ariadne brand reference.
- Apple, NVIDIA, and Tesla symbols: Simple Icons v13, fetched from its npm distribution through jsDelivr. Company marks identify example underlying assets, not partnerships; trademarks remain with their owners. Project: https://github.com/simple-icons/simple-icons.
- Microsoft mark: four native CSS squares.
- Cormorant Garamond and Manrope: locally served fonts. Their OFL license files are included in `public/fonts/`.

## Previous hero verification — 2026-09-27

- Production Next.js build and TypeScript check passed.
- Browser-tested desktop and 390px-wide mobile layouts; no horizontal document overflow at the mobile size.
- Verified Apple selection updates the issuer representation; verified SDK/MCP dialog content and Escape dismissal.
- Verified English, Chinese, and Korean switching, refresh persistence, and cookie preference when revisiting the root URL.
- Verified mobile navigation opens/closes and the logo receives pointer-driven rotation/translation.
- Inspected rendered desktop/mobile screenshots; browser warning/error log was empty during testing.
- Core `git diff -- src` SHA-1 remained `d5ed68b94a5097d6475fd0abd5418aee3242a2e3`, matching the pre-work snapshot. Pre-existing core changes were not altered.

## Expanded website verification — 2026-09-27

- Production build and TypeScript passed.
- `node apps/web/scripts/test-product.mjs`: directory/filter/pagination/empty-result contracts, Demo research coverage, read-only boundaries, page routes and unknown-document 404 passed.
- `node --import tsx apps/web/scripts/test-boundary.ts`: fixed upstream endpoints, parameter allowlist, transport failure and upstream errors passed. Tests mock only the local test process's fetch; running services stay up.
- Browser-tested desktop marketing scenes, asset search, company/representation switch, issuer filtering, Chinese asset detail and developer navigation, SDK/MCP switching, documentation search and chapter navigation.
- Browser-tested Korean documentation and asset workspace at 390px; document width remains 390px. Chinese homepage audience switching also has no horizontal document overflow.
- Language choice follows internal links. API-supplied warnings preserve the original text and are labeled accordingly.
- Repaired the smooth-scroll route-transition hint reported during QA. Source-based syntax highlighting and single-representation connector geometry were refined after inspection.
- Core diff fingerprint still matches the pre-work snapshot listed above.

No deployment, commit, or push was performed. Visual acceptance remains with the user. Live-source validation, wider core Demo research coverage and funded execution remain separate work, not implied complete by these pages.

## Homepage density refinement — 2026-09-27

- Supersedes the expanded homepage relationship scene, tilted evidence paper and oversized audience glyphs above. Restored the original horizontal company layout and its red-thread connection to Hero; added selected-asset navigation and representation counts.
- Added a compact identity/context/evidence illustration and four audience-specific previews. Marketing examples remain labeled; there are no invented live prices or transactional actions.
- Homepage details use a scoped CSS module. Hero JSX was compared byte-for-byte and is unchanged. Independent product pages, shared navigation, data routes and core source were not edited.
- Browser checked company selection, evidence switching, all four audience states, Chinese/English desktop layout and Chinese mobile layout. At 390px, document width was 390px with no nested vertical scrolling; browser error log was empty.
- Production build, typecheck, product route/API checks and boundary tests passed. Core diff fingerprint remains unchanged. Local preview remains running; no commit, push or deployment.
