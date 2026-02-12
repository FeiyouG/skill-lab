/**
 * Analyzer types: state, permissions, risks.
 */
import type { SkillFile, SkillReader } from "@FeiyouG/skill-lab";

export type PermissionScope = "fs" | "sys" | "net" | "env" | "hooks" | "data";
export type PermissionValue = `${PermissionScope}:${string}`;

export type RiskSeverity = "info" | "warning" | "critical";

export type AnalysisPermissions = {
    list: PermissionValue[];
    references?: Record<string, string[]>;
};

export type RiskItem = {
    type: string;
    severity: RiskSeverity;
    permission?: PermissionValue;
    reference?: string;
    message?: string;
};

export type AnalysisRisks = {
    list: RiskItem[];
    references?: Record<string, string[]>;
};

export type AnalyzerState = {
    version: string;
    skillId: string;
    skillVersionId: string;
    runNumber?: number;
    repoUrl?: string;
    commitHash?: string;
    dir?: string | null;
    files?: SkillFile[];
    frontmatter?: Record<string, string> | null;
    permissions?: AnalysisPermissions;
    risks?: AnalysisRisks;
    riskLevel?: string;
    summary?: string;
    rawResults?: Record<string, unknown>;
};

export type AnalyzerContext = {
    skillReader: SkillReader;
};
