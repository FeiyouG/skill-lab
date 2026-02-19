import type { RiskCode } from "skill-lab/shared";
import { PermissionScope } from "skill-lab/shared";
import type { TreesitterGrammar } from "../treesitter/registry.ts";

export const DEFAULT_SKILL_VERSION = "0.0.1";

export type LanguagePolicy = {
    imports?: string[];
};

export type NetworkPolicy = {
    domains?: string[];
};

export type ScanConfig = {
    maxFileSize?: number;
    maxFileCount?: number;
    maxScanDepth?: number;
};

export type Allowlist = {
    languages?: Partial<Record<TreesitterGrammar, LanguagePolicy>>;
    network?: NetworkPolicy;
};

export type Denylist = {
    languages?: Partial<Record<TreesitterGrammar, LanguagePolicy>>;
    network?: NetworkPolicy;
};

export type AnalyzerConfig = {
    scan?: ScanConfig;
    allowlist?: Allowlist;
    denylist?: Denylist;
    riskReport?: RiskReportConfig;
};

export type RiskUpliftConfig = Partial<Record<RiskCode, number>>;

export type RiskThresholdConfig = {
    safe: number;
    caution: number;
    attention: number;
    risky: number;
    avoid: number;
};

export type RiskReportConfig = {
    baseScore?: {
        info?: number;
        warning?: number;
        critical?: number;
    };
    uplift?: RiskUpliftConfig;
    thresholds?: RiskThresholdConfig;
};

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
