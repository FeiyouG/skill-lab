import ProgressBar from "@deno-library/progress";
import { SkillAnalyzerResult } from "../../result.ts";
import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import { DEFAULT_ANALYZER_CONFIG, resolveConfig } from "../../config/mod.ts";
import { analyzeDependencyRisks } from "./dep-risks.ts";
import { analyzeRuleMappedRisks } from "./rule-mapped.ts";

const REMOTE_SCRIPT_WARNING = "Remote script content analysis is NOT_IMPLEMENTED";
const ANSI_SHOW_CURSOR = "\x1b[?25h";
const ENCODER = new TextEncoder();

export async function run003Risks(
    state: AnalyzerState,
    context?: Pick<AnalyzerContext, "showProgressBar" | "config">,
): Promise<SkillAnalyzerResult> {
    let next = state;
    const resolvedConfig = context?.config ?? resolveConfig(DEFAULT_ANALYZER_CONFIG);

    const shouldRenderProgress = (context?.showProgressBar ?? false) && Deno.stderr.isTerminal();
    const riskBar = shouldRenderProgress
        ? new ProgressBar({
            total: Math.max(1, next.findings.length),
            clear: true,
            output: Deno.stderr,
            display: "Finalizing [:bar] :completed/:total findings :percent",
        })
        : null;
    let processed = 0;

    try {
        if (riskBar) {
            await riskBar.render(processed);
        }

        const resolvedContext = { config: resolvedConfig };
        next = analyzeDependencyRisks(next, resolvedContext);
        next = analyzeRuleMappedRisks(next, resolvedContext, () => {
            processed += 1;
            if (riskBar) {
                void riskBar.render(processed);
            }
        });
    } finally {
        if (riskBar) {
            await riskBar.end();
        }
        if (shouldRenderProgress && Deno.stderr.isTerminal()) {
            Deno.stderr.writeSync(ENCODER.encode(ANSI_SHOW_CURSOR));
        }
    }

    next = addRemoteScriptWarningIfNeeded(next);
    return new SkillAnalyzerResult(dedupeRisks(next), resolvedConfig);
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
