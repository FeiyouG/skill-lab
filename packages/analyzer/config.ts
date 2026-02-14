import { PermissionScope, Severity } from "skill-lab/shared";
import type { AnalyzerConfig } from "./types.ts";

export const DEFAULT_SKILL_VERSION = "0.0.1";

export const DEFAULT_CONFIG: AnalyzerConfig = {
    maxFileSize: 1_000_000,
    maxFileCount: 100,
    maxScanDepth: 5,
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
