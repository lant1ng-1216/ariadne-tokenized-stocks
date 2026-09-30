import { types as utilTypes } from "node:util";

/**
 * Clone JSON-shaped data without invoking toJSON methods or accessor getters.
 * Rejects custom prototypes, accessors, symbols and executable values so a
 * plan cannot change meaning between validation and registration.
 */
export function jsonDataSnapshot<T>(input: T): T {
  const ancestors = new Set<object>();

  const clone = (value: unknown, inArray = false): unknown => {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("Plan contains a non-finite number");
      return value;
    }
    if (value === undefined && !inArray) return undefined;
    if (value === undefined && inArray) return null;
    if (typeof value !== "object") throw new Error("Plan contains a non-JSON value");
    if (utilTypes.isProxy(value)) throw new Error("Plan must not contain Proxy objects");
    if (ancestors.has(value)) throw new Error("Plan contains a circular reference");

    const isArray = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      throw new Error("Plan must contain only plain JSON data");
    }
    if (Object.getOwnPropertySymbols(value).length) throw new Error("Plan must not contain symbol properties");
    ancestors.add(value);
    try {
      if (isArray) {
        const array = value as unknown[];
        const descriptors = Object.getOwnPropertyDescriptors(array);
        const output: unknown[] = [];
        for (let index = 0; index < array.length; index += 1) {
          const descriptor = descriptors[String(index)];
          if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new Error("Plan arrays must contain plain data values");
          output.push(clone(descriptor.value, true));
        }
        for (const key of Object.keys(descriptors)) {
          const index = Number(key);
          const isIndex = /^(?:0|[1-9]\d*)$/.test(key) && Number.isSafeInteger(index) && index < array.length;
          if (key !== "length" && !isIndex) throw new Error("Plan arrays must not contain named properties");
        }
        return output;
      }

      const descriptors = Object.getOwnPropertyDescriptors(value);
      if (Object.prototype.hasOwnProperty.call(descriptors, "toJSON")) throw new Error("Plan must not define serialization hooks");
      const output: Record<string, unknown> = {};
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (!descriptor.enumerable) throw new Error("Plan objects must contain only enumerable data properties");
        if (!("value" in descriptor)) throw new Error("Plan objects must not contain accessors");
        if (descriptor.value !== undefined) Object.defineProperty(output, key, {
          value: clone(descriptor.value), enumerable: true, configurable: true, writable: true
        });
      }
      return output;
    } finally {
      ancestors.delete(value);
    }
  };

  return clone(input) as T;
}

/** Fingerprint validated JSON data without invoking inherited serialization hooks. */
export function jsonDataFingerprint(input: unknown): string {
  const snapshot = jsonDataSnapshot(input);
  const encode = (value: unknown): string => {
    if (value === null) return "null";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(encode).join(",")}]`;
    if (typeof value === "object") {
      const object = value as Record<string, unknown>;
      return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${encode(object[key])}`).join(",")}}`;
    }
    return "undefined";
  };
  return encode(snapshot);
}
