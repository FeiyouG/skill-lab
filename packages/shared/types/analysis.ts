/**
 * Analysis-related types for skill security screening.
 */

/**
 * Permission scope.
 */
export type PermissionScope = "fs" | "sys" | "net" | "env" | "hooks" | "data";

/**
 * Permission value in scope:permission format.
 */
export type PermissionValue = `${PermissionScope}:${string}`;

/**
 * Risk signal severity.
 */
export type RiskSeverity = "info" | "warning" | "critical";

/**
 * Detected permissions for a skill.
 */
export interface SkillPermissions {
    list: PermissionValue[];
    references?: Record<string, string[]>;
}

/**
 * Individual risk signal from analysis.
 */
export interface RiskSignal {
    /** Signal type identifier */
    type: string;
    /** Severity level */
    severity: RiskSeverity;
    /** Human-readable message */
    message?: string;
    /** Permission that contributed to the risk */
    permission?: PermissionValue;
    /** Location in source (path:Lx-Ly) */
    reference?: string;
}

/**
 * Risk signals container.
 */
export interface RiskSignals {
    list: RiskSignal[];
    references?: Record<string, string[]>;
}

/**
 * Complete analysis result for a skill version.
 */
export interface Analysis {
    /** Skill version ID */
    skillVersionId: string;
    /** Run number (0, 1, 2... for re-analyses) */
    runNumber: number;
    /** Version of the analyzer that produced this result */
    analyzerVersion: string;
    /** Detected permissions */
    permissions: SkillPermissions;
    /** Risk signals */
    riskSignals: RiskSignals;
    /** Analysis status */
    status?: "pending" | "analyzing" | "completed" | "failed";
    /** Raw analysis data (detailed findings) */
    rawResults?: Record<string, unknown>;
    /** Human-readable summary */
    summary?: string;
    /** Analysis timestamp */
    analyzedAt: string;
}

/**
 * Known risk signal types.
 */
export const RISK_SIGNAL_TYPES = {
    // Code execution risks
    DYNAMIC_EVAL: "dynamic_eval",
    SUBPROCESS_EXECUTION: "subprocess_execution",
    CODE_GENERATION: "code_generation",

    // Filesystem risks
    WIDE_FILESYSTEM_SCOPE: "wide_filesystem_scope",
    FILE_DELETION: "file_deletion",
    HIDDEN_FILE_ACCESS: "hidden_file_access",

    // Network risks
    EXTERNAL_REQUESTS: "external_requests",
    DATA_EXFILTRATION: "data_exfiltration",

    // Credential risks
    CREDENTIAL_ACCESS: "credential_access",
    ENV_VAR_ACCESS: "env_var_access",

    // Dependency risks
    UNPINNED_DEPENDENCIES: "unpinned_dependencies",
    SUSPICIOUS_DEPENDENCIES: "suspicious_dependencies",

    // Install-time risks
    INSTALL_SCRIPTS: "install_scripts",
    POST_INSTALL_HOOKS: "post_install_hooks",
} as const;

export type RiskSignalType = (typeof RISK_SIGNAL_TYPES)[keyof typeof RISK_SIGNAL_TYPES];
