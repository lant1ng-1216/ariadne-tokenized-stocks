import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const reportPath = "docs/DEVELOPER_EXPERIENCE_REPORT.md";
const readmePath = "README.md";
const figureDir = "research/figures/developer-experience";
const report = await readFile(reportPath, "utf8");
const readme = await readFile(readmePath, "utf8");
const figureScript = await readFile(`${figureDir}/render_developer_experience.py`, "utf8");
const reportHeadings = [
  "## 2. Evaluation design",
  "### 3.1 Onboarding:",
  "### 3.2 Documentation:",
  "### 3.3 API traps and latency:",
  "### 3.4 AI stack and wallet:",
  "### 3.5 Tokenized-stock data:",
  "### 3.6 Engineering recommendations and feature gaps",
  "## 4. Limitations",
  "## 5. Conclusion",
  "## References",
];
for (const heading of reportHeadings) assert.ok(report.includes(heading), `report section missing: ${heading}`);
assert.match(report, /Measured[\s\S]*Observed[\s\S]*Verified implementation[\s\S]*Interpretation[\s\S]*Unverified/);
assert.match(report, /Codex/);
assert.match(report, /MCP-compatible Agent/);
assert.match(report, /not.*representative/i);
assert.match(readme, /docs\/DEVELOPER_EXPERIENCE_REPORT\.md/);
assert.match(readme, /Quickstart/);
assert.match(readme, /SDK usage/i);
assert.doesNotMatch(readme, /105 audited request records|2,279 ms|239\/442|founder-funded|0\.171525%/i, "README should remain repository/setup guidance, not duplicate research results");

for (const sourcePath of [
  "research/experiments/records/readonly.jsonl",
  "research/experiments/records/safety.jsonl",
]) {
  await access(sourcePath);
  assert.ok(figureScript.includes(sourcePath), `figure source is not referenced by generator: ${sourcePath}`);
}

assert.match(figureScript, /figure-01-api-experiment/);
assert.match(figureScript, /figure-02-retry-experiment/);
assert.match(figureScript, /estimated_dispatch_ms|estimatedDispatchMs/i);
assert.match(report, /80 repeated provider calls/);
assert.match(report, /ten sequential cycles against a deterministic loopback server/);

const figureStems = ["figure-01-api-experiment", "figure-02-retry-experiment"];
const requiredExtensions = ["png", "pdf", "svg", "tiff"];
for (const stem of figureStems) {
  for (const extension of requiredExtensions) {
    const path = `${figureDir}/${stem}.${extension}`;
    await access(path);
    const metadata = await stat(path);
    assert.ok(metadata.size > 1000, `figure artifact looks empty: ${path}`);
    assert.ok(report.includes(`${stem}.png`), `report does not embed ${stem}.png`);
  }
}

let localLinksChecked = 0;
for (const file of [readmePath, reportPath, `${figureDir}/README.md`]) {
  const contents = await readFile(file, "utf8");
  const links = contents.matchAll(/!?(?:\[[^\]]*\])\((<[^>]+>|[^)\s]+)(?:\s+["'][^)]*["'])?\)/g);
  for (const [, rawTarget] of links) {
    const target = rawTarget.startsWith("<") ? rawTarget.slice(1, -1) : rawTarget;
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
    const localPath = decodeURIComponent(target.split(/[?#]/, 1)[0] ?? "");
    if (!localPath) continue;
    await access(resolve(dirname(file), localPath));
    localLinksChecked += 1;
  }
}

console.log(JSON.stringify({
  report: reportPath,
  reportSectionsVerified: reportHeadings.length,
  reportEvidenceClassesPresent: true,
  experimentRecordSourcesDeclared: 2,
  publicationFigureFormats: requiredExtensions,
  localMarkdownLinksChecked: localLinksChecked,
  readmeFocusedOnUseAndNavigation: true,
  passed: true,
}, null, 2));
