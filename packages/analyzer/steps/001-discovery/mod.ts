import { DEFAULT_SKILL_VERSION, FRONTMATTER_SUPPORTED_FIELDS } from "../../config.ts";
import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import { discoverReferencedFiles } from "./discover-files.ts";
import { filterScanQueue } from "./filter-files.ts";

export async function run001Discovery(
    state: AnalyzerState,
    context: AnalyzerContext,
): Promise<AnalyzerState> {
    const files = await context.skillReader.listFiles();
    const skillMdPath = await context.skillReader.getSkillMdPath();
    const frontmatter = await context.skillReader.getSkillMdFrontmatter();

    const nextState: AnalyzerState = {
        ...state,
        files,
        frontmatter,
        skillId: String(frontmatter.name ?? state.skillId),
        skillVersionId: String(
            frontmatter.metadata?.version ?? state.skillVersionId ?? DEFAULT_SKILL_VERSION,
        ),
    };

    for (const field of Object.keys(frontmatter)) {
        if (
            !FRONTMATTER_SUPPORTED_FIELDS.includes(
                field as (typeof FRONTMATTER_SUPPORTED_FIELDS)[number],
            ) && ![
                "startLineNumber",
                "endLineNumber",
            ].includes(field)
        ) {
            nextState.warnings.push(
                `Unknown frontmatter field '${field}' - analysis not supported yet`,
            );
        }
    }

    const discovered = await discoverReferencedFiles(context, {
        startQueue: [{ path: skillMdPath, depth: 0 }],
        allFiles: files,
        readTextFile: (path) => context.skillReader.readTextFile(path),
        maxScanDepth: state.metadata.config.maxScanDepth,
    });

    discovered.push({
        path: skillMdPath,
        sourceType: "local",
        fileType: "markdown",
        role: "entrypoint",
        depth: 0,
    });

    const filtered = filterScanQueue({
        queue: discovered,
        allFiles: files,
        maxFileCount: state.metadata.config.maxFileCount,
        maxFileSize: state.metadata.config.maxFileSize,
    });

    console.log(filtered);

    return {
        ...nextState,
        scanQueue: filtered.queue,
        metadata: {
            ...nextState.metadata,
            skippedFiles: [...nextState.metadata.skippedFiles, ...filtered.skipped],
        },
    };
}
