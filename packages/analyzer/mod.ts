import { DEFAULT_CONFIG, DEFAULT_SKILL_VERSION } from "./config.ts";
import { run001Discovery, run002Permissions, run003Risks } from "./steps/mod.ts";
import type { AnalyzerConfig, AnalyzerResult, AnalyzerState } from "./types.ts";
import type { SkillReaderFactoryOptions } from "../skillreader/factory.ts";
import { SkillReaderFactory } from "../skillreader/factory.ts";
import { TreesitterClient } from "./treesiter/client.ts";
import { AstGrepClient } from "./astgrep/mod.ts";

export type { AnalyzerConfig, AnalyzerResult, AnalyzerState } from "./types.ts";

export { DEFAULT_CONFIG, DEFAULT_SKILL_VERSION } from "./config.ts";

export type AnalyzerAnalyzeInput = SkillReaderFactoryOptions & {
    skillId?: string;
    skillVersionId?: string;
    config?: Partial<AnalyzerConfig>;
};

export class Analyzer {
    analyze(input: AnalyzerAnalyzeInput): Promise<AnalyzerResult> {
        return runAnalysis({
            options: {
                source: input.source,
                subDir: input.subDir,
                gitRef: input.gitRef,
                githubToken: input.githubToken,
            },
            skillId: input.skillId,
            skillVersionId: input.skillVersionId,
            config: input.config,
        });
    }
}

export async function runAnalysis(input: {
    options: SkillReaderFactoryOptions;
    skillId?: string;
    skillVersionId?: string;
    config?: Partial<AnalyzerConfig>;
}): Promise<AnalyzerResult> {
    let state = createInitialState({
        skillId: input.skillId,
        skillVersionId: input.skillVersionId,
        config: input.config,
    });

    const skillReader = await SkillReaderFactory.create(input.options);

    const validation = await skillReader.validate();
    if (!validation.ok) {
        throw new Error(validation.reason ?? "Invalid skill repository");
    }

    const context = {
        skillReader,
        treesitterClient: new TreesitterClient(),
        astgrepClient: new AstGrepClient(),
    };

    state = await run001Discovery(state, context);
    state = await run002Permissions(state, context);
    return run003Risks(state);
}

export function createInitialState(input?: {
    skillId?: string;
    skillVersionId?: string;
    config?: Partial<AnalyzerConfig>;
}): AnalyzerState {
    return {
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
