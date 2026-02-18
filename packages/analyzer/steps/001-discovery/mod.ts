import { MultiProgressBar } from "@deno-library/progress";
import { DEFAULT_SKILL_VERSION, FRONTMATTER_SUPPORTED_FIELDS } from "../../config.ts";
import { showProgress } from "../../logging.ts";
import type { DownloadProgressEvent } from "../../treesitter/registry.ts";
import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import { discoverReferencedFiles } from "./discover-files.ts";
import { filterScanQueue } from "./filter-files.ts";

const SPINNER_FRAMES = ["|", "/", "-", "\\"];

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

    const shouldRenderProgress = showProgress(context) && Deno.stderr.isTerminal();

    let discoveredCount = 0;
    let spinnerFrame = 0;
    let spinnerTimer: number | undefined;

    // Download progress state (updated by onDownloadProgress callback)
    let downloadLabel = "";
    let downloadReceived = 0;
    let downloadTotal = 1;

    const multiBar = shouldRenderProgress
        ? new MultiProgressBar({
            output: Deno.stderr,
            clear: true,
            // Display format is per-row; set default here, overridden in render()
            display: ":text :bar :percent",
        })
        : null;

    /** Render both rows atomically into the MultiProgressBar. */
    const renderBars = async (spinnerLabel: string, discoveredN: number) => {
        if (!multiBar) return;
        await multiBar.render([
            {
                // Row 0: spinner + discovered count (no actual bar — use text only)
                completed: 1,
                total: 1,
                text: `${spinnerLabel} Discovering... ${discoveredN} files found`,
                complete: " ",
                incomplete: " ",
            },
            {
                // Row 1: grammar download progress (blank when idle)
                completed: downloadReceived,
                total: downloadTotal,
                text: downloadLabel,
            },
        ]);
    };

    if (multiBar) {
        await renderBars(SPINNER_FRAMES[0], 0);
        spinnerTimer = setInterval(() => {
            spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
            void renderBars(SPINNER_FRAMES[spinnerFrame], discoveredCount);
        }, 80);
    }

    // Wire grammar download progress into row 1 of the multi-bar
    const onDownloadProgress = multiBar
        ? (event: DownloadProgressEvent) => {
            downloadLabel = event.label;
            downloadReceived = event.received;
            downloadTotal = Math.max(event.total, 1);
            void renderBars(SPINNER_FRAMES[spinnerFrame], discoveredCount);
        }
        : undefined;

    context.treesitterClient.setOnDownloadProgress(onDownloadProgress);
    context.astgrepClient.setOnDownloadProgress(onDownloadProgress);

    const discovered = await discoverReferencedFiles(context, {
        startQueue: [{ path: skillMdPath, depth: 0 }],
        allFiles: files,
        readTextFile: (path) => context.skillReader.readTextFile(path),
        maxScanDepth: state.metadata.config.maxScanDepth,
        onDiscover: (count) => {
            discoveredCount = count;
            void renderBars(SPINNER_FRAMES[spinnerFrame], count);
        },
    });

    // Clean up
    context.treesitterClient.setOnDownloadProgress(undefined);
    context.astgrepClient.setOnDownloadProgress(undefined);

    if (spinnerTimer !== undefined) clearInterval(spinnerTimer);
    if (multiBar) {
        await multiBar.end();
    }

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

    return {
        ...nextState,
        scanQueue: filtered.queue,
        metadata: {
            ...nextState.metadata,
            skippedFiles: [...nextState.metadata.skippedFiles, ...filtered.skipped],
        },
    };
}
