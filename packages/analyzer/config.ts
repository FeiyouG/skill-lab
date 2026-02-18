import { PermissionScope, Severity } from "skill-lab/shared";
import type { TreesitterGrammar } from "./treesitter/registry.ts";

export const DEFAULT_SKILL_VERSION = "0.0.1";

// ---------------------------------------------------------------------------
// AnalyzerConfig — user-facing permission policy + scan resource limits
// ---------------------------------------------------------------------------

/** Language-specific policy entry. Keyed to TreesitterGrammar values so it
 *  stays in sync with the languages the analyzer actually supports. */
export type LanguagePolicy = {
    /** Module / import names to allow or deny. Exact string match at evaluation time. */
    imports?: string[];
};

/** Cross-language network policy applied to any network permission,
 *  regardless of which language or tool triggered it. */
export type NetworkPolicy = {
    /** External hostnames, e.g. "api.github.com", "pypi.org" */
    domains?: string[];
};

/** Scan / resource limits. */
export type ScanConfig = {
    /** Maximum file size in bytes to scan. Default: 1_000_000 */
    maxFileSize?: number;
    /** Maximum number of files to scan. Default: 100 */
    maxFileCount?: number;
    /** Maximum directory depth to traverse. Default: 5 */
    maxScanDepth?: number;
};

/** What the operator has explicitly blessed.
 *  Defined separately from Denylist so each can grow independently. */
export type Allowlist = {
    /** Per-language import allowlists, keyed by TreesitterGrammar. */
    languages?: Partial<Record<TreesitterGrammar, LanguagePolicy>>;
    /** Cross-language network allowlist. */
    network?: NetworkPolicy;
};

/** What is always forbidden, overriding any allowlist entry.
 *  If an import or domain appears in both, the denylist wins. */
export type Denylist = {
    /** Per-language import denylists, keyed by TreesitterGrammar. */
    languages?: Partial<Record<TreesitterGrammar, LanguagePolicy>>;
    /** Cross-language network denylist. */
    network?: NetworkPolicy;
};

/** Unified top-level config passed by the caller.
 *  Replaces the old AnalyzerConfig and extends it with permission policy.
 *
 *  Precedence: denylist > allowlist > default risk behavior.
 *  Absent keys fall back to DEFAULT_ANALYZER_CONFIG. */
export type AnalyzerConfig = {
    scan?: ScanConfig;
    allowlist?: Allowlist;
    denylist?: Denylist;
};

export const DEFAULT_ANALYZER_CONFIG: AnalyzerConfig = {
    scan: {
        maxFileSize: 1_000_000,
        maxFileCount: 100,
        maxScanDepth: 5,
    },
    allowlist: undefined,
    denylist: undefined,
};

/** Deep-merges a partial caller config onto the defaults.
 *  Caller values override defaults at every level;
 *  absent caller keys fall back to the default. */
export function resolveConfig(partial?: Partial<AnalyzerConfig>): AnalyzerConfig {
    return {
        scan: { ...DEFAULT_ANALYZER_CONFIG.scan, ...partial?.scan },
        allowlist: partial?.allowlist ?? DEFAULT_ANALYZER_CONFIG.allowlist,
        denylist: partial?.denylist ?? DEFAULT_ANALYZER_CONFIG.denylist,
    };
}

export const ALLOWED_TOOLS_MAPPING: Record<
    string,
    { tool: string; scope: PermissionScope; permission: string }
> = {
    Bash: { tool: "bash", scope: "sys", permission: "shell" },
    Read: { tool: "read", scope: "fs", permission: "read" },
    Write: { tool: "write", scope: "fs", permission: "write" },
    Edit: { tool: "edit", scope: "fs", permission: "write" },
    WebFetch: { tool: "webfetch", scope: "net", permission: "fetch" },
    Fetch: { tool: "fetch", scope: "net", permission: "fetch" },
    Subprocess: { tool: "subprocess", scope: "sys", permission: "subprocess" },
};

export const TOOLS_MAPPING: Record<string, { scope: PermissionScope; permission: string }> = {
    gh: { scope: "sys", permission: "shell" },
    git: { scope: "sys", permission: "shell" },
    jq: { scope: "sys", permission: "shell" },
    curl: { scope: "net", permission: "fetch" },
    wget: { scope: "net", permission: "fetch" },
    npm: { scope: "sys", permission: "shell" },
    pnpm: { scope: "sys", permission: "shell" },
    yarn: { scope: "sys", permission: "shell" },
    python: { scope: "sys", permission: "shell" },
    node: { scope: "sys", permission: "shell" },
    deno: { scope: "sys", permission: "shell" },
    docker: { scope: "sys", permission: "shell" },
};

export const SCORING = {
    severity: {
        info: 0,
        warning: 2,
        critical: 4,
    } as Record<Severity, number>,
    permissions: {
        "fs:read": 1,
        "env:read": 1,
        "net:fetch": 1,
        "fs:write": 2,
        "sys:shell": 2,
        "sys:subprocess": 2,
        "sys:sudo": 3,
    } as Record<string, number>,
    scopeWildcard: 1,
    uplift: {
        externalPost: 2,
        pipeToShell: 3,
        multipleCritical: 1,
        secretsInRequest: 2,
    },
};

export const UNSUPPORTED_SKILL_FRONTMATTER_FIELDS = [
    "argument-hint",
    "disable-model-invocation",
    "user-invocable",
    "model",
    "context",
    "agent",
    "hooks",
] as const;

export const FRONTMATTER_SUPPORTED_FIELDS = [
    "name",
    "description",
    "license",
    "compatibility",
    "metadata",
    "allowed-tools",
] as const;
