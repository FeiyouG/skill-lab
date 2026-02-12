export function generatePermissionId(
    tool: string,
    args: string[] = ["*"],
    metadata?: Record<string, unknown>,
): string {
    const normalizedArgs = args.length > 0 ? args : ["*"];
    const base = sanitize(`${tool}-${normalizedArgs.join("-")}`);
    const normalizedMetadata = filterMetadataForHash(metadata ?? {});

    const shouldHash = normalizedArgs.length > 1 || Object.keys(normalizedMetadata).length > 0;
    if (!shouldHash) return base;

    const hashInput = stableStringify({ args: normalizedArgs, metadata: normalizedMetadata });
    return `${base}-${shortHash(hashInput)}`;
}

export function generateRiskId(type: string, index: number): string {
    return sanitize(`risk-${type}-${index + 1}`);
}

function sanitize(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9.*-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function filterMetadataForHash(metadata: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
        if (key === "pattern") continue;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            result[key] = value;
        }
    }
    return result;
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => `${key}:${stableStringify(item)}`);
        return `{${entries.join(",")}}`;
    }
    return JSON.stringify(value);
}

function shortHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36).padStart(6, "0").slice(0, 6);
}
