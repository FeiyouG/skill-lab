import type { AnalyzerResult, AnalyzerState } from "../../types.ts";
import { analyzeDestructiveAndPrivilegeRisks } from "./destructive.ts";
import { analyzeInjectionAndPromptRisks } from "./injection.ts";
import { analyzeNetworkRisks } from "./network.ts";
import { toAnalyzerResult } from "./output.ts";
import { analyzeSecretRisks } from "./secrets.ts";

export function run003Risks(state: AnalyzerState): AnalyzerResult {
    let next = state;
    next = analyzeNetworkRisks(next);
    next = analyzeDestructiveAndPrivilegeRisks(next);
    next = analyzeSecretRisks(next);
    next = analyzeInjectionAndPromptRisks(next);
    return toAnalyzerResult(dedupeRisks(next));
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
