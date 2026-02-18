export type JsonValue =
    | null
    | boolean
    | number
    | string
    | JsonObject
    | JsonArray;

export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export type ArrayMerge = (base: JsonArray, override: JsonArray) => JsonArray;

export type DeepMergeOptions = {
    arrayMerge?: ArrayMerge;
};

const DEFAULT_OPTIONS: DeepMergeOptions = {
    arrayMerge: undefined,
};

function isPlainObject(value: unknown): value is JsonObject {
    if (!value || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function mergeInternal(base: JsonValue, override: JsonValue, options: DeepMergeOptions): JsonValue {
    if (override === undefined) return base;

    if (Array.isArray(base) && Array.isArray(override)) {
        return options.arrayMerge ? options.arrayMerge(base, override) : override;
    }

    if (isPlainObject(base) && isPlainObject(override)) {
        const result: JsonObject = {};
        const keys = new Set([...Object.keys(base), ...Object.keys(override)]);

        for (const key of keys) {
            if (key in override) {
                const merged = mergeInternal(base[key], override[key], options);
                if (merged !== undefined) {
                    result[key] = merged;
                }
            } else {
                result[key] = base[key];
            }
        }

        return result;
    }

    return override;
}

export function deepMergeJson<T>(base: T, override: unknown, options?: DeepMergeOptions): T {
    const resolvedOptions = options ? { ...DEFAULT_OPTIONS, ...options } : DEFAULT_OPTIONS;
    return mergeInternal(base as JsonValue, override as JsonValue, resolvedOptions) as T;
}

export function mergeArrayUnion(base: JsonArray, override: JsonArray): JsonArray {
    const merged = [...base, ...override];
    const seen = new Set<unknown>();
    const result: JsonArray = [];

    for (const item of merged) {
        if (seen.has(item)) continue;
        seen.add(item);
        result.push(item);
    }

    return result;
}
