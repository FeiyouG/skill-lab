import type { TreesitterGrammar } from "../treesitter/registry.ts";
import type { AnalyzerConfig, LanguagePolicy, RiskReportConfig } from "./types.ts";

export const NODE_BUILTIN_IMPORTS = [
    "buffer",
    "child_process",
    "crypto",
    "events",
    "fs",
    "fs/promises",
    "http",
    "https",
    "os",
    "path",
    "stream",
    "timers",
    "url",
    "util",
    "node:buffer",
    "node:child_process",
    "node:crypto",
    "node:events",
    "node:fs",
    "node:fs/promises",
    "node:http",
    "node:https",
    "node:os",
    "node:path",
    "node:stream",
    "node:timers",
    "node:url",
    "node:util",
] as const;

export const PYTHON_BUILTIN_IMPORTS = [
    "argparse",
    "collections",
    "datetime",
    "functools",
    "hashlib",
    "itertools",
    "json",
    "logging",
    "math",
    "os",
    "os.path",
    "pathlib",
    "re",
    "shutil",
    "subprocess",
    "sys",
    "tempfile",
    "typing",
    "urllib",
    "urllib.parse",
    "urllib.request",
] as const;

export const DEFAULT_ALLOWLIST_LANGUAGES: Partial<Record<TreesitterGrammar, LanguagePolicy>> = {
    javascript: { imports: [...NODE_BUILTIN_IMPORTS] },
    typescript: { imports: [...NODE_BUILTIN_IMPORTS] },
    tsx: { imports: [...NODE_BUILTIN_IMPORTS] },
    python: { imports: [...PYTHON_BUILTIN_IMPORTS] },
};

export const DEFAULT_RISK_REPORT_CONFIG: Required<RiskReportConfig> = {
    baseScore: {
        info: 0,
        warning: 1,
        critical: 5,
    },
    uplift: {
        "NETWORK:data_exfiltration": 5,
        "NETWORK:remote_code_execution": 5,
        "NETWORK:credential_leak": 7,
        "NETWORK:localhost_secret_exposure": 2,
    },
    thresholds: {
        safe: 0,
        caution: 1,
        attention: 3,
        risky: 5,
        avoid: 7,
    },
};

export const DEFAULT_ANALYZER_CONFIG: AnalyzerConfig = {
    scan: {
        maxFileSize: 1_000_000,
        maxFileCount: 100,
        maxScanDepth: 5,
    },
    allowlist: {
        languages: DEFAULT_ALLOWLIST_LANGUAGES,
    },
    denylist: undefined,
    riskReport: DEFAULT_RISK_REPORT_CONFIG,
};
