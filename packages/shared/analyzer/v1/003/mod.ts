/**
 * Step 3: Computes risk level from severity + permission scores.
 */
import type { AnalyzerState, PermissionValue, RiskSeverity } from "../types.ts";

export function runStep3(state: AnalyzerState): AnalyzerState {
    const permissions = state.permissions?.list ?? [];
    const risks = state.risks?.list ?? [];
    const severityScore = Math.max(
        0,
        ...risks.map((risk) => severityToScore(risk.severity)),
    );
    const permScore = permissionsToScore(permissions);
    const total = severityScore + permScore;
    const riskLevel = normalizeRiskLevel(total);
    const summary = buildSummary(permissions, risks.length, riskLevel);

    return {
        ...state,
        riskLevel,
        summary,
    };
}

// Severity → score
function severityToScore(severity: RiskSeverity): number {
    switch (severity) {
        case "critical":
            return 4;
        case "warning":
            return 2;
        default:
            return 0;
    }
}

// Permissions → score
function permissionsToScore(perms: PermissionValue[]): number {
    let score = 0;
    if (perms.includes("fs:read")) score = Math.max(score, 1);
    if (perms.includes("fs:write")) score = Math.max(score, 2);
    if (perms.includes("net:fetch")) score = Math.max(score, 1);
    if (perms.includes("sys:shell") || perms.includes("sys:subprocess")) score = Math.max(score, 2);
    if (perms.includes("sys:sudo")) score = Math.max(score, 3);
    if (perms.includes("hooks:run")) score = Math.max(score, 2);
    return score;
}

// Score → level
function normalizeRiskLevel(score: number): string {
    if (score <= 0) return "safe";
    if (score === 1) return "caution";
    if (score === 2) return "attention";
    if (score === 3) return "risky";
    return "avoid";
}

// Generate summary
function buildSummary(
    permissions: PermissionValue[],
    riskCount: number,
    riskLevel: string,
): string {
    if (riskLevel === "avoid") return "High-risk skill with critical behaviors detected.";
    if (riskLevel === "risky") return "Skill has elevated access or automation risks.";
    if (riskLevel === "attention") return "Skill can modify system state or run commands.";
    if (riskLevel === "caution") return "Skill has limited side effects.";
    if (riskCount > 0) return "Skill contains low-impact risk signals.";
    if (permissions.length === 0) return "Read-only skill with no detected side effects.";
    return "Skill uses limited capabilities with no major risk signals.";
}
