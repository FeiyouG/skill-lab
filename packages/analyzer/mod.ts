import { DEFAULT_ANALYZER_CONFIG, DEFAULT_SKILL_VERSION, resolveConfig } from "./config/mod.ts";
import { NO_OP_LOGGER } from "./logging.ts";
import { SkillAnalyzerResult } from "./result.ts";
import { run001Discovery, run002Permissions, run003Risks } from "./steps/mod.ts";
import type { AnalyzerConfig, AnalyzerLogger, AnalyzerState } from "./types.ts";
import type { SkillReaderFactoryOptions } from "../skillreader/factory.ts";
import { SkillReaderFactory } from "../skillreader/factory.ts";
import { TreesitterClient } from "./treesitter/client.ts";
import { AstGrepClient } from "./astgrep/mod.ts";

export type { AnalyzerConfig, AnalyzerLogger, AnalyzerState } from "./types.ts";
export type { Allowlist, Denylist, LanguagePolicy, NetworkPolicy, ScanConfig } from "./config/mod.ts";

export { SkillAnalyzerResult } from "./result.ts";
export { DEFAULT_ANALYZER_CONFIG, DEFAULT_SKILL_VERSION, resolveConfig } from "./config/mod.ts";

export type AnalyzerAnalyzeInput = SkillReaderFactoryOptions & {
    skillId?: string;
    skillVersionId?: string;
    config?: Partial<AnalyzerConfig>;
    logger?: AnalyzerLogger;
    showProgressBar?: boolean;
};

export class Analyzer {
    analyze(input: AnalyzerAnalyzeInput): Promise<SkillAnalyzerResult> {
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
            logger: input.logger,
            showProgressBar: input.showProgressBar,
        });
    }
}

export async function runAnalysis(input: {
    options: SkillReaderFactoryOptions;
    skillId?: string;
    skillVersionId?: string;
    config?: Partial<AnalyzerConfig>;
    logger?: AnalyzerLogger;
    showProgressBar?: boolean;
}): Promise<SkillAnalyzerResult> {
    const config = resolveConfig(input.config);

    let state = createInitialState({
        skillId: input.skillId,
        skillVersionId: input.skillVersionId,
        config,
    });

    const skillReader = await SkillReaderFactory.create(input.options);

    const validation = await skillReader.validate();
    if (!validation.ok) {
        throw new Error(validation.reason ?? "Invalid skill repository");
    }

    const logger = input.logger ?? NO_OP_LOGGER;
    const showProgressBar = input.showProgressBar ?? false;

    const context = {
        skillReader,
        treesitterClient: new TreesitterClient(logger, showProgressBar),
        astgrepClient: new AstGrepClient(logger, showProgressBar),
        logger,
        showProgressBar,
        config,
    };

    state = await run001Discovery(state, context);
    state = await run002Permissions(state, context);
    return await run003Risks(state, context);
}

export function createInitialState(input?: {
    skillId?: string;
    skillVersionId?: string;
    config?: Partial<AnalyzerConfig>;
}): AnalyzerState {
    const resolvedConfig = resolveConfig(input?.config);
    const scan = resolvedConfig.scan ?? DEFAULT_ANALYZER_CONFIG.scan ?? {
        maxFileSize: 1_000_000,
        maxFileCount: 100,
        maxScanDepth: 5,
    };
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
            scannedFiles: new Set<string>(),
            skippedFiles: [],
            rulesUsed: [],
            config: scan,
        },
    };
}
