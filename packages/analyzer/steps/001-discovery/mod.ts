import { DEFAULT_SKILL_VERSION, FRONTMATTER_SUPPORTED_FIELDS } from "../../config.ts";
import type { AnalyzerContext, AnalyzerState, FileReference } from "../../types.ts";
import { discoverReferencedFiles } from "./discover-files.ts";
import { filterScanQueue } from "./filter-files.ts";

export async function run001Discovery(
    state: AnalyzerState,
    context: AnalyzerContext,
): Promise<AnalyzerState> {
    const files = await context.skillReader.listFiles();
    const skillMdPath = await context.skillReader.getSkillMdPath();

    if (!skillMdPath) throw new Error("Invalid skill repository: SKILL.md must exist at root");

    // SkillReader guarantees valid and parseable frontmatter.
    const frontmatter = await context.skillReader.getSkillMdFrontmatter();
    const skillMdContent = await context.skillReader.getSkillMdContent();

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
            )
        ) {
            nextState.warnings.push(
                `Unknown frontmatter field '${field}' - analysis not supported yet`,
            );
        }
    }

    const frontmatterLineEnd = estimateFrontmatterLineEnd(skillMdContent);
    nextState.metadata.frontmatterRangeEnd = frontmatterLineEnd;

    const discovered = await discoverReferencedFiles({
        startQueue: [{ path: skillMdPath, depth: 0 }],
        allFiles: files,
        readTextFile: (path) => context.skillReader.readTextFile(path),
        maxScanDepth: state.metadata.config.maxScanDepth,
    });

    const queueWithRoot: FileReference[] = [
        {
            path: skillMdPath,
            sourceType: "local",
            fileType: "markdown",
            role: "entrypoint",
            depth: 0,
        },
        ...discovered,
    ];

    const filtered = filterScanQueue({
        queue: queueWithRoot,
        allFiles: files,
        maxFileCount: state.metadata.config.maxFileCount,
        maxFileSize: state.metadata.config.maxFileSize,
    });

    return {
        ...nextState,
        scanQueue: filtered.queue,
        metadata: {
            ...nextState.metadata,
            skippedFiles: [...nextState.metadata.skippedFiles, ...filtered.skipped],
        },
    };
}

function estimateFrontmatterLineEnd(content: string): number {
    const lines = content.split("\n");
    if (lines[0]?.trim() !== "---") return 1;
    for (let i = 1; i < lines.length; i += 1) {
        if (lines[i].trim() === "---") return i + 1;
    }
    return Math.min(lines.length, 20);
}
