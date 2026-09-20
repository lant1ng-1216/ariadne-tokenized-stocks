import { readFile } from "node:fs/promises";

const source = await readFile("docs/PHASE_ACCEPTANCE.md", "utf8");
const rows = source.split("\n").filter((line) => line.startsWith("|") && !line.includes("必做项") && !line.includes("---"));
const incomplete = rows.filter((line) => /\| (Not started|In progress|Partial|Blocked) \|\s*$/.test(line));
const verified = rows.filter((line) => /\| verified \|\s*$/.test(line));
console.log(JSON.stringify({ totalItems: rows.length, verifiedItems: verified.length, incompleteItems: incomplete.length, incomplete }, null, 2));
if (incomplete.length > 0) process.exitCode = 1;
