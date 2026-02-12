import { DEFAULT_CONFIG, DEFAULT_SKILL_VERSION, VERSION } from "./config.ts";
import { run001Discovery, run002Permissions, run003Risks } from "./steps/mod.ts";
import type { AnalyzerConfig, AnalyzerContext, AnalyzerResult, AnalyzerState } from "./types.ts";

export type {
    AnalyzerConfig,
    AnalyzerResult,
    AnalyzerState,
    FileReference,
    Finding,
    Permission,
    PermissionScope,
    Reference,
    ReferenceType,
    Risk,
    Severity,
} from "./types.ts";
export { DEFAULT_CONFIG, DEFAULT_SKILL_VERSION, VERSION } from "./config.ts";

export async function runAnalysis(input: {
    context: AnalyzerContext;
    skillId?: string;
    skillVersionId?: string;
    config?: Partial<AnalyzerConfig>;
}): Promise<AnalyzerResult> {
    let state = createInitialState({
        skillId: input.skillId,
        skillVersionId: input.skillVersionId,
        config: input.config,
    });

    state = await run001Discovery(state, input.context);
    state = await run002Permissions(state, input.context);
    return run003Risks(state);
}

export function createInitialState(input?: {
    skillId?: string;
    skillVersionId?: string;
    config?: Partial<AnalyzerConfig>;
}): AnalyzerState {
    return {
        version: VERSION,
        skillId: input?.skillId ?? "unknown",
        skillVersionId: input?.skillVersionId ?? DEFAULT_SKILL_VERSION,
        files: [],
        frontmatter: {},
        scanQueue: [],
        permissions: [],
        findings: [],
        risks: [],
        warnings: [],
        metadata: {
            scannedFiles: [],
            skippedFiles: [],
            rulesUsed: [],
            config: {
                ...DEFAULT_CONFIG,
                ...(input?.config ?? {}),
            },
        },
    };
}
