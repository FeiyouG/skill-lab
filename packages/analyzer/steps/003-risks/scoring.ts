import { DEFAULT_ANALYZER_CONFIG, resolveConfig } from "../../config/mod.ts";
import type { AnalyzerConfig } from "../../config/mod.ts";
import type { AnalyzerState } from "../../types.ts";

type RiskLevel = "safe" | "caution" | "attention" | "risky" | "avoid";
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

export function scoreState(state: AnalyzerState): {
    score: number;
    riskLevel: RiskLevel;
    summary: string;
};
export function scoreState(
    state: AnalyzerState,
    config: AnalyzerConfig,
): {
    score: number;
    riskLevel: RiskLevel;
    summary: string;
};
export function scoreState(
    state: AnalyzerState,
    config?: AnalyzerConfig,
): {
    score: number;
    riskLevel: RiskLevel;
    summary: string;
} {
    const resolvedConfig = resolveConfig(config ?? DEFAULT_ANALYZER_CONFIG);
    const baseScore = {
        info: 0,
        warning: 1,
        critical: 5,
        ...(resolvedConfig.riskReport?.baseScore ?? {}),
    };
    const upliftConfig = resolvedConfig.riskReport?.uplift ?? {};
    const thresholds = {
        safe: 0,
        caution: 1,
        attention: 3,
        risky: 5,
        avoid: 7,
        ...(resolvedConfig.riskReport?.thresholds ?? {}),
    };

    const groupedSeverity = new Map<string, number>();
    const ungroupedSeverity: number[] = [];

    for (const risk of state.risks) {
        const score = baseScore[risk.severity] ?? 0;
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

    const riskTypes = new Set(state.risks.map((risk) => risk.type));
    const upliftScore = Array.from(riskTypes).reduce(
        (sum, riskType) => sum + (upliftConfig[riskType] ?? 0),
        0,
    );

    const score = severityScore + upliftScore;
    const riskLevel = toRiskLevel(score, thresholds);
    const summary = buildSummary(state, riskLevel);

    return { score, riskLevel, summary };
}

function toRiskLevel(
    score: number,
    thresholds: { safe: number; caution: number; attention: number; risky: number; avoid: number },
): RiskLevel {
    if (score >= thresholds.avoid) return "avoid";
    if (score >= thresholds.risky) return "risky";
    if (score >= thresholds.attention) return "attention";
    if (score >= thresholds.caution) return "caution";
    return "safe";
}

function buildSummary(
    state: AnalyzerState,
    riskLevel: RiskLevel,
): string {
    if (state.risks.length === 0) return "No significant risk signals detected.";

    const sorted = [...state.risks].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );
    const topSeverity = sorted[0].severity;
    const topTypes = [
        ...new Set(
            sorted.filter((risk) => risk.severity === topSeverity).map((risk) => risk.type),
        ),
    ].slice(0, 3);
    const typeList = topTypes.join(", ");

    if (riskLevel === "avoid") {
        return `Severe risks detected: ${typeList}.`;
    }
    if (riskLevel === "risky") {
        return `Elevated risk: ${typeList}.`;
    }
    if (riskLevel === "attention") {
        return `Moderate risk: ${typeList}.`;
    }
    if (riskLevel === "caution") {
        return `Low-risk signals: ${typeList}.`;
    }
    return "No significant risk signals detected.";
}
