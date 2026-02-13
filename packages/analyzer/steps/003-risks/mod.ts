import type { AnalyzerResult, AnalyzerState } from "../../types.ts";
import { toAnalyzerResult } from "./output.ts";
import { analyzeRuleMappedRisks } from "./rule-mapped.ts";

const REMOTE_SCRIPT_WARNING = "Remote script content analysis is NOT_IMPLEMENTED";

export function run003Risks(state: AnalyzerState): AnalyzerResult {
    let next = state;
    next = analyzeRuleMappedRisks(next);
    next = addRemoteScriptWarningIfNeeded(next);
    return toAnalyzerResult(dedupeRisks(next));
}

function addRemoteScriptWarningIfNeeded(state: AnalyzerState): AnalyzerState {
    const hasRemoteCodeExecution = state.risks.some((risk) =>
        risk.type === "NETWORK:remote_code_execution"
    );
    if (!hasRemoteCodeExecution) return state;
    if (state.warnings.includes(REMOTE_SCRIPT_WARNING)) return state;
    return {
        ...state,
        warnings: [...state.warnings, REMOTE_SCRIPT_WARNING],
    };
}

function dedupeRisks(state: AnalyzerState): AnalyzerState {
    const map = new Map<string, AnalyzerState["risks"][number]>();

    for (const risk of state.risks) {
        const key = `${risk.type}:${risk.reference.file}:${risk.reference.line}`;
        if (!map.has(key)) {
            map.set(key, risk);
            continue;
        }
        const existing = map.get(key)!;
        existing.permissions = Array.from(new Set([...existing.permissions, ...risk.permissions]));
    }

    return {
        ...state,
        risks: Array.from(map.values()),
    };
}
