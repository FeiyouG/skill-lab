import type { TreesitterGrammar } from "../../treesitter/registry.ts";
import type { AnalyzerConfig } from "../../config.ts";

function normalizeEntry(value: string): string {
    return value.trim().toLowerCase();
}

function listHasValue(list: string[] | undefined, value: string | undefined): boolean {
    if (!value || !list || list.length === 0) return false;
    const normalized = normalizeEntry(value);
    return list.some((entry) => normalizeEntry(entry) === normalized);
}

export function isDenied(
    config: AnalyzerConfig,
    grammar: TreesitterGrammar,
    importName: string,
): boolean {
    const imports = config.denylist?.languages?.[grammar]?.imports;
    return listHasValue(imports, importName);
}

export function isAllowed(
    config: AnalyzerConfig,
    grammar: TreesitterGrammar,
    importName: string,
): boolean {
    const imports = config.allowlist?.languages?.[grammar]?.imports;
    return listHasValue(imports, importName);
}

export function isNetworkDenied(config: AnalyzerConfig, host: string): boolean {
    return listHasValue(config.denylist?.network?.domains, host);
}

export function isNetworkAllowed(config: AnalyzerConfig, host: string): boolean {
    return listHasValue(config.allowlist?.network?.domains, host);
}
