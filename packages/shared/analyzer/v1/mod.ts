/**
 * Analyzer v1: 4-step pipeline that enriches AnalyzerState.
 */
import type { AnalyzerContext, AnalyzerState } from "./types.ts";
import { runStep0 as runStep000 } from "./000/mod.ts";
import { runStep1 as runStep001 } from "./001/mod.ts";
import { runStep2 as runStep002 } from "./002/mod.ts";
import { runStep3 as runStep003 } from "./003/mod.ts";

export const ANALYZER_VERSION = "analyzer-v1";
export const FINAL_STEP = 3;

export function createInitialState(input: {
    skillId: string;
    skillVersionId: string;
    repoUrl?: string;
    commitHash?: string;
    dir?: string | null;
}): AnalyzerState {
    return {
        version: ANALYZER_VERSION,
        skillId: input.skillId,
        skillVersionId: input.skillVersionId,
        repoUrl: input.repoUrl,
        commitHash: input.commitHash,
        dir: input.dir ?? null,
    };
}

export async function runStep(
    step: number,
    state: AnalyzerState,
    context: AnalyzerContext,
): Promise<AnalyzerState> {
    switch (step) {
        case 0:
            return runStep000(state, context);
        case 1:
            return runStep001(state, context);
        case 2:
            return runStep002(state, context);
        case 3:
            return await Promise.resolve(runStep003(state));
        default:
            throw new Error(`Invalid step ${step}`);
    }
}
