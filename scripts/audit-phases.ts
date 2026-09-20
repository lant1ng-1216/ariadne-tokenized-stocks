import { readFile } from "node:fs/promises";

const source = await readFile("docs/PHASE_ACCEPTANCE.md", "utf8");
const totalItems = Number(source.match(/\| Acceptance items \| (\d+) \|/)?.[1] ?? 0);
const verifiedItems = Number(source.match(/\| Verified \| (\d+) \|/)?.[1] ?? 0);
const incomplete = source.split("\n").filter((line) => line.startsWith("|") && /\| (Not started|In progress|Partial|Blocked)/.test(line));
const incompleteItems = Number(source.match(/\| Incomplete or externally blocked \| (\d+) \|/)?.[1] ?? incomplete.length);
console.log(JSON.stringify({ totalItems, verifiedItems, incompleteItems, incomplete }, null, 2));
if (incompleteItems > 0) process.exitCode = 1;
