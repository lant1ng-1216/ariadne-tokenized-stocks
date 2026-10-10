export type ProviderJsonType = "invalid_json" | "null" | "array" | "object" | "string" | "number" | "boolean";
export type ProviderFieldCheck = "present" | "missing" | "wrong_type" | "unavailable";

export type ProviderResponseDiagnostics = {
  httpStatus: number;
  /** Normalized MIME type only; parameters and other header values are excluded. */
  contentType: string;
  jsonType: ProviderJsonType;
  /** Bounded, sanitized top-level property names. Property values are never included. */
  topLevelKeys: string[];
  topLevelKeysTruncated: boolean;
  requiredFields: {
    code: ProviderFieldCheck;
    msg: ProviderFieldCheck;
    success: ProviderFieldCheck;
    data: ProviderFieldCheck;
  };
};

const MAX_TOP_LEVEL_KEYS = 20;
const MAX_KEY_LENGTH = 64;

function normalizedContentType(value: string | null): string {
  const mimeType = value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mimeType) ? mimeType : "unknown";
}

function jsonType(value: unknown): Exclude<ProviderJsonType, "invalid_json"> {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "object": return "object";
    case "string": return "string";
    case "number": return "number";
    case "boolean": return "boolean";
    default: throw new TypeError("Expected a JSON-compatible provider response value");
  }
}

function safeTopLevelKeys(value: unknown): { keys: string[]; truncated: boolean } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return { keys: [], truncated: false };
  const allKeys = Object.keys(value);
  const safeKeys = allKeys
    .map((key) => /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(key) ? key.slice(0, MAX_KEY_LENGTH) : "[redacted-key]")
    .sort();
  return {
    keys: [...new Set(safeKeys)].slice(0, MAX_TOP_LEVEL_KEYS),
    truncated: safeKeys.length > MAX_TOP_LEVEL_KEYS
  };
}

function requiredFieldChecks(value: unknown): ProviderResponseDiagnostics["requiredFields"] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { code: "missing", msg: "missing", success: "missing", data: "missing" };
  }
  const record = value as Record<string, unknown>;
  const typed = (field: "code" | "msg" | "success", expected: "number" | "string" | "boolean"): ProviderFieldCheck => {
    if (!Object.hasOwn(record, field)) return "missing";
    return typeof record[field] === expected ? "present" : "wrong_type";
  };
  return {
    code: typed("code", "number"),
    msg: typed("msg", "string"),
    success: typed("success", "boolean"),
    data: Object.hasOwn(record, "data") ? "present" : "missing"
  };
}

export function diagnoseInvalidJsonResponse(httpStatus: number, contentType: string | null): ProviderResponseDiagnostics {
  return {
    httpStatus,
    contentType: normalizedContentType(contentType),
    jsonType: "invalid_json",
    topLevelKeys: [],
    topLevelKeysTruncated: false,
    requiredFields: { code: "unavailable", msg: "unavailable", success: "unavailable", data: "unavailable" }
  };
}

export function diagnoseResponseEnvelope(httpStatus: number, contentType: string | null, payload: unknown): ProviderResponseDiagnostics {
  const keys = safeTopLevelKeys(payload);
  return {
    httpStatus,
    contentType: normalizedContentType(contentType),
    jsonType: jsonType(payload),
    topLevelKeys: keys.keys,
    topLevelKeysTruncated: keys.truncated,
    requiredFields: requiredFieldChecks(payload)
  };
}

export function sanitizeProviderResponseDiagnostics(value: unknown): ProviderResponseDiagnostics | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const fields = record.requiredFields;
  if (fields === null || typeof fields !== "object" || Array.isArray(fields)) return undefined;
  const fieldRecord = fields as Record<string, unknown>;
  const fieldChecks: ProviderFieldCheck[] = ["present", "missing", "wrong_type", "unavailable"];
  const allowedJsonTypes: ProviderJsonType[] = ["invalid_json", "null", "array", "object", "string", "number", "boolean"];
  const contentTypeIsSafe = record.contentType === "unknown" || (typeof record.contentType === "string" && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(record.contentType));
  const keysAreSafe = Array.isArray(record.topLevelKeys) && record.topLevelKeys.length <= MAX_TOP_LEVEL_KEYS &&
    record.topLevelKeys.every((key) => typeof key === "string" && key.length <= MAX_KEY_LENGTH && (/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(key) || key === "[redacted-key]"));
  const fieldsAreSafe = ["code", "msg", "success", "data"].every((field) => fieldChecks.includes(fieldRecord[field] as ProviderFieldCheck));
  if (!Number.isInteger(record.httpStatus) || (record.httpStatus as number) < 0 || (record.httpStatus as number) > 599 ||
      !contentTypeIsSafe || !allowedJsonTypes.includes(record.jsonType as ProviderJsonType) || !keysAreSafe ||
      typeof record.topLevelKeysTruncated !== "boolean" || !fieldsAreSafe) return undefined;
  return {
    httpStatus: record.httpStatus as number,
    contentType: record.contentType as string,
    jsonType: record.jsonType as ProviderJsonType,
    topLevelKeys: [...record.topLevelKeys as string[]],
    topLevelKeysTruncated: record.topLevelKeysTruncated,
    requiredFields: {
      code: fieldRecord.code as ProviderFieldCheck,
      msg: fieldRecord.msg as ProviderFieldCheck,
      success: fieldRecord.success as ProviderFieldCheck,
      data: fieldRecord.data as ProviderFieldCheck
    }
  };
}
