import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function csv(path) {
  const [header, ...rows] = readFileSync(path, "utf8").trim().split(/\r?\n/);
  const parseRow = (line) => {
    const values = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === "," && !quoted) { values.push(value); value = ""; continue; }
      value += char;
    }
    values.push(value);
    return values;
  };
  const keys = parseRow(header);
  return rows.map((row) => {
    const values = parseRow(row);
    return Object.fromEntries(keys.map((key, index) => [key, values[index] ?? ""]));
  });
}

const root = fileURLToPath(new URL(".", import.meta.url));
const dictionary = csv(`${root}data-dictionary.csv`);
const matrix = csv(`${root}test-matrix.csv`);
const requiredDictionary = ["record_id", "observed_at", "scenario_id", "endpoint", "response_class", "handling_decision", "warning_count", "broadcasted", "source_ref"];
const requiredMatrix = ["scenario_id", "category", "operation", "repeat_target", "requires_funds", "signing_allowed", "broadcast_allowed", "success_criteria"];

const dictionaryFields = new Set(dictionary.map((row) => row.field));
const matrixIds = matrix.map((row) => row.scenario_id);
const duplicateIds = matrixIds.filter((id, index) => matrixIds.indexOf(id) !== index);
const failures = [];
for (const field of requiredDictionary) if (!dictionaryFields.has(field)) failures.push(`missing dictionary field: ${field}`);
for (const field of requiredMatrix) if (!Object.hasOwn(matrix[0] ?? {}, field)) failures.push(`missing matrix column: ${field}`);
if (duplicateIds.length) failures.push(`duplicate scenario ids: ${duplicateIds.join(", ")}`);
for (const row of matrix) {
  if (row.repeat_target !== "3" && Number(row.repeat_target) < 10) failures.push(`repeat target below 10 for repeatable scenario: ${row.scenario_id}`);
  if (row.signing_allowed !== "no" || row.broadcast_allowed !== "no") failures.push(`unsafe permission in scenario: ${row.scenario_id}`);
  if (row.requires_funds !== "no") failures.push(`funds required in stage-1 matrix: ${row.scenario_id}`);
}
if (failures.length) {
  console.error(JSON.stringify({ status: "FAIL", failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASS", dictionaryFields: dictionary.length, scenarios: matrix.length, unsafeScenarios: 0, fundsRequired: 0 }, null, 2));
