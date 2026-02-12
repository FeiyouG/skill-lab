import type { AnalyzerResult, AnalyzerState } from "../../types.ts";
import { scoreState } from "./scoring.ts";

export function toAnalyzerResult(state: AnalyzerState): AnalyzerResult {
    const { score, riskLevel, summary } = scoreState(state);
    return {
        version: state.version,
        analyzedAt: new Date().toISOString(),
        skillId: state.skillId,
        skillVersionId: state.skillVersionId,
        permissions: state.permissions,
        risks: state.risks,
        score,
        riskLevel,
        summary,
        warnings: state.warnings,
        metadata: state.metadata,
    };
}
