import { SCORING } from "../../config.ts";
import type { AnalyzerState } from "../../types.ts";

export function scoreState(state: AnalyzerState): {
    score: number;
    riskLevel: "safe" | "caution" | "attention" | "risky" | "avoid";
    summary: string;
} {
    const groupedSeverity = new Map<string, number>();
    const ungroupedSeverity: number[] = [];

    for (const risk of state.risks) {
        const score = SCORING.severity[risk.severity];
        if (risk.groupKey) {
            groupedSeverity.set(
                risk.groupKey,
                Math.max(groupedSeverity.get(risk.groupKey) ?? 0, score),
            );
            continue;
        }
        ungroupedSeverity.push(score);
    }

    const severityScore = Math.max(0, ...ungroupedSeverity, ...groupedSeverity.values());

    const permissionScore = Math.max(
        0,
        ...state.permissions.map((perm) => {
            const base = SCORING.permissions[`${perm.scope}:${perm.permission}`] ?? 0;
            const wildcard = perm.args?.includes("*") ? SCORING.scopeWildcard : 0;
            return base + wildcard;
        }),
    );

    let uplift = 0;

    const hasExternalPost = state.risks.some((risk) =>
        risk.type === "NETWORK:data_exfiltration" &&
        ["POST", "PUT", "PATCH"].includes(String(risk.metadata?.method ?? "GET").toUpperCase())
    );
    if (hasExternalPost) uplift += SCORING.uplift.externalPost;

    const hasPipeToShell = state.risks.some((risk) =>
        risk.type === "NETWORK:remote_code_execution"
    );
    if (hasPipeToShell) uplift += SCORING.uplift.pipeToShell;

    const criticalCount = state.risks.filter((risk) => risk.severity === "critical").length;
    if (criticalCount >= 3) uplift += SCORING.uplift.multipleCritical;

    const hasSecretTransfer = state.risks.some((risk) =>
        risk.type === "NETWORK:credential_leak" ||
        risk.type === "NETWORK:localhost_secret_exposure"
    );
    if (hasSecretTransfer) uplift += SCORING.uplift.secretsInRequest;

    const score = severityScore + permissionScore + uplift;
    const riskLevel = toRiskLevel(score);
    const summary = buildSummary(state, riskLevel);

    return { score, riskLevel, summary };
}

function toRiskLevel(score: number): "safe" | "caution" | "attention" | "risky" | "avoid" {
    if (score <= 0) return "safe";
    if (score <= 2) return "caution";
    if (score <= 4) return "attention";
    if (score <= 6) return "risky";
    return "avoid";
}

function buildSummary(
    state: AnalyzerState,
    riskLevel: "safe" | "caution" | "attention" | "risky" | "avoid",
): string {
    const topRisk = state.risks[0]?.type ?? "no major risks";
    const topPermission = state.permissions[0]
        ? `${state.permissions[0].scope}:${state.permissions[0].permission}`
        : "no permissions";

    if (riskLevel === "avoid") {
        return `Critical risks detected (${topRisk}) with elevated capability (${topPermission}).`;
    }
    if (riskLevel === "risky") {
        return `Elevated risk profile (${topRisk}) and broad access (${topPermission}).`;
    }
    if (riskLevel === "attention") {
        return `Moderate risk signal (${topRisk}) from detected capabilities.`;
    }
    if (riskLevel === "caution") {
        return `Low-risk profile with limited permissions (${topPermission}).`;
    }
    return "No significant risk signals detected.";
}
