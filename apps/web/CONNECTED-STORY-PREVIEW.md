# Connected story local preview

Implemented 2026-09-27: homepage sections 02 context, 03 interfaces, 04 brand closure. Hero source and first market section markup preserved. No SDK/MCP or core product edits.

- Context: overlapping information surfaces, scroll-linked assembly and thread drawing, selectable identity/context/evidence explanations.
- Interfaces: individual, developer, agent and institutional presentations with distinct content; links retain locale.
- Closure: Ariadne wordmark, continuing thread and independent asset/developer entry points.
- Native page scrolling; no wheel interception or nested scrolling. Reduced-motion preference disables movement. Mobile panels become a readable grid.

Validation: Next production build and TypeScript passed; product route/filter/pagination regression passed; read-only boundary test passed. Browser inspected at 1440×1000 and 390×844, Chinese and English. Fixed overlapping source/state copy after screenshot inspection. Verified role switches and no horizontal overflow at those widths; browser error log empty.

This is a local implementation for visual review, not a claim of final design approval. Website preview remains at http://localhost:3000/?lang=zh .

2026-09-28 motion pass: the first market segment and the following three sections now share one scroll-position guide, so each segment starts when the preceding one completes. The bright tip reverses with scrolling; unreached paths are faint. Context surfaces respond gently as the tip reaches them. Reduced-motion users see complete paths without scroll-driven movement. Rechecked desktop/mobile seams, reverse scrolling, horizontal overflow, production build, product regression and read-only boundary test. Core source diff checksum remains unchanged.

Later 2026-09-28 seam/end correction: the market SVG now terminates precisely at the context section boundary instead of extending underneath its opaque background. Closing progress is normalized to the actual scroll distance available before the page bottom, so it reaches 100% with a visible terminal point. Desktop and mobile closing paths take different clear gutters. Verified a zero-pixel market/context SVG seam, full closing progress at page bottom, desktop/mobile screenshots, build, product regression and unchanged core source checksum.
