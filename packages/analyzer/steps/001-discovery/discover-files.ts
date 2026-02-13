import type { SkillFile } from "@FeiyouG/skill-lab";
import type { CodeBlock } from "../../rules/markdown/extractCodeBlocks.ts";
import { FILETYPE_CONFIGS, RULES_BY_FILETYPE } from "../../rules/mod.ts";
import { isHostFsPath, isUrl } from "../../rules/shared/file-refs.ts";
import type { FileRefDiscovery } from "../../rules/shared/file-refs.ts";
import type { FileReference, FileType, Reference } from "../../types.ts";
import { getFileRole, getFileType } from "../../utils/file-classifier.ts";
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
export async function discoverReferencedFiles(input: {
    startQueue: StartQueueItem[];
    allFiles: SkillFile[];
    readTextFile: (path: string) => Promise<string | null>;
    maxScanDepth: number;
}): Promise<FileReference[]> {
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
        const blocks = await extractBlocksForDiscovery(content, currentFileType);

        for (const block of blocks) {
            const blockRefs = await extractRefsForBlock(block);
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

                const existsInSkill = input.allFiles.some((file) => file.path === normalizedPath);
                if (existsInSkill) {
                    const resolvedFileType = getFileType(normalizedPath);
                    const localEntry: FileReference = {
                        path: normalizedPath,
                        sourceType: "local",
                        fileType: resolvedFileType,
                        role: getFileRole(normalizedPath),
                        depth: current.depth + 1,
                        discoveryMethod: absoluteRef.via,
                        referencedBy: referenceFromCurrent,
                    };
                    discovered.set(normalizedPath, localEntry);

                    if (resolvedFileType === "markdown" || resolvedFileType === "text") {
                        queue.push({
                            path: normalizedPath,
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

async function extractBlocksForDiscovery(
    content: string,
    fileType: FileType,
): Promise<CodeBlock[]> {
    const config = FILETYPE_CONFIGS[fileType];
    if (config?.extractCodeBlocks) {
        return await config.extractCodeBlocks(content, fileType);
    }

    return [{
        language: fileType,
        content,
        startLine: 1,
        endLine: Math.max(1, content.split("\n").length),
        type: "content",
    }];
}

async function extractRefsForBlock(block: CodeBlock): Promise<FileRefDiscovery[]> {
    const blockExtractor = FILETYPE_CONFIGS[block.language]?.extractFileRefs;
    if (!blockExtractor) return [];
    return await blockExtractor(block.content);
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
