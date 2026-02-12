import type { SkillFile } from "@FeiyouG/skill-lab";
import type { FileReference, Reference } from "../../types.ts";
import {
    KNOWN_REFERENCE_EXTENSIONS,
    MARKDOWN_REFERENCE_PATTERNS,
} from "../../rules/markdown/patterns.ts";
import { getFileRole, getFileType, getSourceType } from "../../utils/file-classifier.ts";

type StartQueueItem = { path: string; depth: number; invokedBy?: Reference };

/**
 * Discovers referenced files recursively and excludes starting queue paths.
 */
export async function discoverReferencedFiles(input: {
    startQueue: StartQueueItem[];
    allFiles: SkillFile[];
    readTextFile: (path: string) => Promise<string | null>;
    maxScanDepth: number;
}): Promise<FileReference[]> {
    const discovered = new Map<string, FileReference>();
    const queue: StartQueueItem[] = [...input.startQueue];
    const processed = new Set<string>();
    const startPaths = new Set(input.startQueue.map((item) => normalizePath(item.path)));

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        if (processed.has(current.path) || current.depth > input.maxScanDepth) continue;
        processed.add(current.path);

        const content = await input.readTextFile(current.path);
        if (!content) continue;

        const refs = extractReferences(content);
        for (const ref of refs) {
            const normalizedPath = normalizePath(ref.path);
            if (
                !normalizedPath || discovered.has(normalizedPath) || startPaths.has(normalizedPath)
            ) {
                continue;
            }

            const existsInSkill = input.allFiles.some((file) => file.path === normalizedPath);
            const fileType = getFileType(normalizedPath);
            const entry: FileReference = {
                path: normalizedPath,
                sourceType: getSourceType(existsInSkill),
                fileType,
                role: getFileRole(normalizedPath),
                depth: current.depth + 1,
                invokedBy: {
                    file: current.path,
                    line: ref.line,
                    type: "content",
                    invokedBy: current.invokedBy,
                },
            };

            discovered.set(normalizedPath, entry);
            if (fileType === "markdown" || fileType === "text") {
                queue.push({
                    path: normalizedPath,
                    depth: current.depth + 1,
                    invokedBy: entry.invokedBy,
                });
            }
        }
    }

    return Array.from(discovered.values());
}

function extractReferences(content: string): Array<{ path: string; line: number }> {
    const refs: Array<{ path: string; line: number }> = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const lineNo = i + 1;

        for (const match of line.matchAll(MARKDOWN_REFERENCE_PATTERNS.markdownLink)) {
            const path = match[1]?.trim();
            if (path && !MARKDOWN_REFERENCE_PATTERNS.urlStart.test(path)) {
                refs.push({ path, line: lineNo });
            }
        }

        for (const commandMatch of line.matchAll(MARKDOWN_REFERENCE_PATTERNS.inlineCode)) {
            const parts = commandMatch[1].trim().split(/\s+/);
            for (const part of parts.slice(1)) {
                if (looksLikePath(part)) refs.push({ path: part, line: lineNo });
            }
        }

        for (const match of line.matchAll(MARKDOWN_REFERENCE_PATTERNS.relativePath)) {
            const path = match[0].trim();
            if (looksLikePath(path)) refs.push({ path, line: lineNo });
        }
    }

    return refs;
}

function looksLikePath(value: string): boolean {
    if (MARKDOWN_REFERENCE_PATTERNS.localPathStart.test(value)) return true;
    if (value.includes("/")) return true;
    const ext = value.split(".").pop()?.toLowerCase();
    if (!ext) return false;
    if (!KNOWN_REFERENCE_EXTENSIONS.has(ext)) return false;
    return /[a-zA-Z]/.test(value);
}

function normalizePath(value: string): string {
    return value.replace(/^\/+/, "").replace(/\\/g, "/").trim();
}
