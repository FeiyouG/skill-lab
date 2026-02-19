import type { TreesitterGrammar } from "../treesitter/registry.ts";
import { DEFAULT_ANALYZER_CONFIG } from "./default.ts";
import type { Allowlist, AnalyzerConfig, LanguagePolicy, NetworkPolicy } from "./types.ts";

type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Array<infer U> ? Array<U>
        : T[K] extends Record<string, unknown> ? DeepPartial<T[K]>
        : T[K];
};

export function resolveConfig(partial?: Partial<AnalyzerConfig>): AnalyzerConfig {
    const defaultScan = DEFAULT_ANALYZER_CONFIG.scan ?? {};
    const partialScan = partial?.scan ?? {};
    const defaultRiskReport = DEFAULT_ANALYZER_CONFIG.riskReport ?? {};
    const partialRiskReport = partial?.riskReport ?? {};

    return {
        scan: deepMergeJson(defaultScan, partialScan),
        allowlist: mergeAllowlist(DEFAULT_ANALYZER_CONFIG.allowlist, partial?.allowlist),
        denylist: mergeAllowlist(DEFAULT_ANALYZER_CONFIG.denylist, partial?.denylist),
        riskReport: deepMergeJson(defaultRiskReport, partialRiskReport),
    };
}

export function deepMergeJson<T extends Record<string, unknown>>(
    base: T,
    override: DeepPartial<T>,
): T {
    const result: Record<string, unknown> = { ...base };

    for (const key of Object.keys(override)) {
        const baseValue = result[key];
        const overrideValue = override[key as keyof T];

        if (overrideValue === undefined) continue;

        if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
            result[key] = deepMergeJson(
                baseValue as Record<string, unknown>,
                overrideValue as Record<string, unknown>,
            );
            continue;
        }

        result[key] = overrideValue;
    }

    return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null) return false;
    if (Array.isArray(value)) return false;
    return Object.getPrototypeOf(value) === Object.prototype;
}

function mergeAllowlist(
    base: Allowlist | undefined,
    override: Allowlist | undefined,
): Allowlist | undefined {
    if (!base && !override) return undefined;

    const languages = mergeLanguagePolicies(base?.languages, override?.languages);
    const network = mergeNetworkPolicy(base?.network, override?.network);

    if (!languages && !network) return undefined;
    return { languages, network };
}

function mergeLanguagePolicies(
    base: Partial<Record<TreesitterGrammar, LanguagePolicy>> | undefined,
    override: Partial<Record<TreesitterGrammar, LanguagePolicy>> | undefined,
): Partial<Record<TreesitterGrammar, LanguagePolicy>> | undefined {
    if (!base && !override) return undefined;

    const keys = new Set<TreesitterGrammar>([
        ...Object.keys(base ?? {}) as TreesitterGrammar[],
        ...Object.keys(override ?? {}) as TreesitterGrammar[],
    ]);

    const result: Partial<Record<TreesitterGrammar, LanguagePolicy>> = {};
    for (const key of keys) {
        const imports = mergeStringList(base?.[key]?.imports, override?.[key]?.imports);
        if (!imports) continue;
        result[key] = { imports };
    }

    return Object.keys(result).length > 0 ? result : undefined;
}

function mergeNetworkPolicy(
    base: NetworkPolicy | undefined,
    override: NetworkPolicy | undefined,
): NetworkPolicy | undefined {
    if (!base && !override) return undefined;
    const domains = mergeStringList(base?.domains, override?.domains);
    return domains ? { domains } : undefined;
}

function mergeStringList(
    base: string[] | undefined,
    override: string[] | undefined,
): string[] | undefined {
    if (!base && !override) return undefined;
    const values = new Set<string>([...(base ?? []), ...(override ?? [])]);
    return values.size > 0 ? [...values] : undefined;
}
