import type { SkillFile } from "@FeiyouG/skill-lab";
import { getFileRole, getFileType } from "skill-lab/shared";

import type { AnalyzerContext, CodeBlock } from "../../types.ts";
import { FILETYPE_CONFIGS, RULES_BY_FILETYPE } from "../../rules/mod.ts";
import { isHostFsPath, isUrl } from "../../rules/shared/file-refs.ts";
import type { FileRefDiscovery } from "../../types.ts";
import type { FileReference, FileType, Reference } from "skill-lab/shared";
import { encodeCodeBlockPath } from "../../utils/code-block-path.ts";

type StartQueueItem = { path: string; depth: number; referencedBy?: Reference };

/**
 * Discovers referenced files recursively and excludes starting queue paths.
 *
 * Step 001 is code-block aware:
 * - Extracts code blocks from each file
 * - Runs per-language extractFileRefs on each block
 * - Enqueues discovered local markdown/text files for recursive discovery
 * - Emits virtual code-block FileReferences for step 002 scanning
 */
export async function discoverReferencedFiles(
    context: AnalyzerContext,
    input: {
        startQueue: StartQueueItem[];
        allFiles: SkillFile[];
        readTextFile: (path: string) => Promise<string | null>;
        maxScanDepth: number;
    },
): Promise<FileReference[]> {
    const discovered = new Map<string, FileReference>();
    const queue: StartQueueItem[] = [...input.startQueue];

    // A set of file paths which have been processed
    const processed = new Set<string>();
    const startPaths = new Set(input.startQueue.map((item) => normalizePath(item.path)));

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;

        if (processed.has(current.path) || current.depth > input.maxScanDepth) continue;
        processed.add(current.path);

        const content = await input.readTextFile(current.path);
        if (!content) continue;

        const currentFileType = getFileType(current.path);

        const blocks = await FILETYPE_CONFIGS[currentFileType]?.extractCodeBlocks?.(
            context,
            content,
        ) ?? [];

        blocks.push({
            language: currentFileType,
            content,
            startLine: 1,
            endLine: Math.max(1, content.split("\n").length),
            type: "content",
        });

        for (const block of blocks) {
            const blockRefs =
                await FILETYPE_CONFIGS[block.language]?.extractFileRefs?.(context, block.content) ??
                    [];

            for (const blockRef of blockRefs) {
                const absoluteRef: FileRefDiscovery = {
                    ...blockRef,
                    line: blockRef.line + block.startLine - 1,
                };

                const normalizedPath = normalizePath(absoluteRef.path);
                if (
                    !normalizedPath || startPaths.has(normalizedPath) ||
                    discovered.has(normalizedPath)
                ) {
                    continue;
                }

                const referenceFromCurrent: Reference = {
                    file: current.path,
                    line: absoluteRef.line,
                    type: block.type,
                    referencedBy: current.referencedBy,
                };

                const existsInSkill = input.allFiles.filter((file) =>
                    file.path.includes(normalizedPath)
                );
                if (existsInSkill.length > 0) {
                    for (const file of existsInSkill) {
                        if (discovered.has(file.path)) continue;

                        const resolvedFileType = getFileType(file.path);
                        const localEntry: FileReference = {
                            path: file.path,
                            sourceType: "local",
                            fileType: resolvedFileType,
                            role: getFileRole(file.path),
                            depth: current.depth + 1,
                            discoveryMethod: absoluteRef.via,
                            referencedBy: referenceFromCurrent,
                        };
                        discovered.set(file.path, localEntry);

                        // Keep scaning for files that are referenced within the skill repo
                        queue.push({
                            path: file.path,
                            depth: current.depth + 1,
                            referencedBy: localEntry.referencedBy,
                        });
                    }
                    continue;
                }

                if (isHostFsPath(normalizedPath)) {
                    discovered.set(normalizedPath, {
                        path: normalizedPath,
                        sourceType: "external",
                        fileType: "unknown",
                        role: "host-fs",
                        depth: current.depth + 1,
                        discoveryMethod: absoluteRef.via,
                        referencedBy: referenceFromCurrent,
                    });
                    continue;
                }

                if (isUrl(normalizedPath) || absoluteRef.via === "markdown-link") {
                    discovered.set(normalizedPath, {
                        path: normalizedPath,
                        sourceType: "external",
                        fileType: "unknown",
                        role: "regular",
                        depth: current.depth + 1,
                        discoveryMethod: absoluteRef.via,
                        referencedBy: referenceFromCurrent,
                    });
                    continue;
                }

                if (absoluteRef.via === "import" || absoluteRef.via === "source") {
                    discovered.set(normalizedPath, {
                        path: normalizedPath,
                        sourceType: "external",
                        fileType: "unknown",
                        role: "library",
                        depth: current.depth + 1,
                        discoveryMethod: absoluteRef.via,
                        referencedBy: referenceFromCurrent,
                    });
                    continue;
                }

                // bare-path, inline-code, import, source — silently discard if not in skill
            }

            if (shouldCreateCodeBlockReference(block, currentFileType, current.depth)) {
                const codeBlockPath = encodeCodeBlockPath(
                    current.path,
                    block.startLine,
                    block.endLine,
                );
                if (!discovered.has(codeBlockPath)) {
                    discovered.set(codeBlockPath, {
                        path: codeBlockPath,
                        sourceType: "local",
                        fileType: block.language,
                        role: "script",
                        depth: current.depth + 1,
                        discoveryMethod: "code-block",
                        referencedBy: {
                            file: current.path,
                            line: block.startLine,
                            lineEnd: block.endLine,
                            type: block.type,
                            referencedBy: current.referencedBy,
                        },
                    });
                }
            }
        }
    }

    return Array.from(discovered.values());
}

function shouldCreateCodeBlockReference(
    block: CodeBlock,
    parentFileType: FileType,
    parentDepth: number,
): boolean {
    if (parentDepth < 0) return false;
    if (block.type === "content") return false;
    if (
        block.language === parentFileType && parentFileType !== "markdown" &&
        parentFileType !== "text"
    ) {
        return false;
    }
    return Boolean(RULES_BY_FILETYPE[block.language]?.length);
}

function normalizePath(value: string): string {
    return value.replace(/^\/+/, "").replace(/\\/g, "/").trim();
}

export type { FileRefDiscovery };
