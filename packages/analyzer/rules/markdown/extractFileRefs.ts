/**
 * AST-based file reference extractor for Markdown content.
 *
 * Extracts file path references using:
 * - tree-sitter block grammar + MARKDOWN_QUERY.INLINE to find inline nodes
 * - tree-sitter inline grammar for inline_link, code_span, text nodes
 * - regex fallback if AST parsing fails
 */

import { BARE_PATH_PATTERN, isUrl, looksLikePath } from "../shared/file-refs.ts";
import type { AnalyzerContext, FileRefDiscovery } from "../../types.ts";
import { MARKDOWN_INLINE_QUERY, MARKDOWN_QUERY } from "./astTypes.ts";
import type { Node as TsNode } from "web-tree-sitter";

export async function extractMarkdownFileRefs(
    context: AnalyzerContext,
    content: string,
): Promise<FileRefDiscovery[]> {
    try {
        const refs: FileRefDiscovery[] = [];
        const blockTree = await context.treesitterClient.parse("markdown", content);

        const inlineNodeQuery = await context.treesitterClient.createQuery(
            "markdown",
            MARKDOWN_QUERY.INLINE,
        );
        const inlineParser = await context.treesitterClient.getParser("markdown-inline");

        const linkDestQuery = await context.treesitterClient.createQuery(
            "markdown-inline",
            MARKDOWN_INLINE_QUERY.INLINE_LINK_DEST,
        );
        const codeSpanQuery = await context.treesitterClient.createQuery(
            "markdown-inline",
            MARKDOWN_INLINE_QUERY.CODE_SPAN,
        );
        const textQuery = await context.treesitterClient.createQuery(
            "markdown-inline",
            MARKDOWN_INLINE_QUERY.TEXT,
        );

        for (const inlineMatch of inlineNodeQuery.matches(blockTree.rootNode)) {
            for (const inlineCapture of inlineMatch.captures) {
                if (inlineCapture.name !== "inline") continue;
                const inlineNode = inlineCapture.node as TsNode;
                const blockLine = inlineNode.startPosition.row;

                const inlineTree = inlineParser.parse(inlineNode.text);
                if (!inlineTree) continue;
                const inlineRoot = inlineTree.rootNode;

                for (const match of linkDestQuery.matches(inlineRoot)) {
                    for (const capture of match.captures) {
                        if (capture.name !== "dest") continue;
                        const destNode = capture.node as TsNode;
                        const path = destNode.text.trim();
                        if (!path || isUrl(path) || path.startsWith("#")) continue;
                        refs.push({ path, line: blockLine + 1, via: "markdown-link" });
                    }
                }

                for (const match of codeSpanQuery.matches(inlineRoot)) {
                    for (const capture of match.captures) {
                        if (capture.name !== "code") continue;
                        const codeNode = capture.node as TsNode;
                        const snippet = codeNode.text.replace(/^`+/, "").replace(/`+$/, "").trim();
                        if (!snippet) continue;
                        const parts = snippet.split(/\s+/);
                        for (let pi = 0; pi < parts.length; pi++) {
                            const part = parts[pi];
                            if (pi === 0 && !part.includes("/") && !part.includes(".")) continue;
                            if (looksLikePath(part) && !isUrl(part)) {
                                refs.push({ path: part, line: blockLine + 1, via: "inline-code" });
                            }
                        }
                    }
                }

                for (const match of textQuery.matches(inlineRoot)) {
                    for (const capture of match.captures) {
                        if (capture.name !== "text") continue;
                        const textNode = capture.node as TsNode;
                        BARE_PATH_PATTERN.lastIndex = 0;
                        for (const pathMatch of textNode.text.matchAll(BARE_PATH_PATTERN)) {
                            const path = pathMatch[0].trim();
                            if (!path || isUrl(path) || !looksLikePath(path)) continue;
                            refs.push({ path, line: blockLine + 1, via: "bare-path" });
                        }
                    }
                }
            }
        }

        return deduplicateRefs(refs);
    } catch {
        // Fallback to regex-based extraction if AST parsing is unavailable
        return extractMarkdownFileRefsRegex(content);
    }
}

/**
 * Deduplicate refs, preferring higher-specificity discovery methods.
 * Priority: markdown-link > inline-code > bare-path
 */
function deduplicateRefs(refs: FileRefDiscovery[]): FileRefDiscovery[] {
    const priority: Record<string, number> = {
        "markdown-link": 3,
        "inline-code": 2,
        "bare-path": 1,
        "import": 2,
        "url": 3,
        "source": 2,
    };

    const best = new Map<string, FileRefDiscovery>();
    for (const ref of refs) {
        const key = `${ref.path}:${ref.line}`;
        const existing = best.get(key);
        if (!existing || (priority[ref.via] ?? 0) > (priority[existing.via] ?? 0)) {
            best.set(key, ref);
        }
    }

    return Array.from(best.values());
}

/**
 * Regex-based fallback for when AST parsing is unavailable.
 */
function extractMarkdownFileRefsRegex(content: string): FileRefDiscovery[] {
    const refs: FileRefDiscovery[] = [];
    const lines = content.split("\n");
    let inFencedBlock = false;

    const markdownLink = /\[[^\]]+\]\(([^)]+)\)/g;
    const inlineCode = /`([^`\n]+)`/g;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNo = i + 1;

        if (/^[ \t]*(`{3,}|~{3,})/.test(line)) {
            inFencedBlock = !inFencedBlock;
            continue;
        }
        if (inFencedBlock) continue;

        markdownLink.lastIndex = 0;
        for (const match of line.matchAll(markdownLink)) {
            const path = match[1]?.trim();
            if (path && !isUrl(path) && !path.startsWith("#")) {
                refs.push({ path, line: lineNo, via: "markdown-link" });
            }
        }

        inlineCode.lastIndex = 0;
        for (const match of line.matchAll(inlineCode)) {
            const parts = match[1].trim().split(/\s+/);
            for (let pi = 0; pi < parts.length; pi++) {
                const part = parts[pi];
                if (pi === 0 && !part.includes("/") && !part.includes(".")) continue;
                if (looksLikePath(part) && !isUrl(part)) {
                    refs.push({ path: part, line: lineNo, via: "inline-code" });
                }
            }
        }

        const maskedLine = line.replace(/\[[^\]]*\]\([^)]*\)/g, "");
        BARE_PATH_PATTERN.lastIndex = 0;
        for (const match of maskedLine.matchAll(BARE_PATH_PATTERN)) {
            const path = match[0].trim();
            if (path && looksLikePath(path) && !isUrl(path)) {
                refs.push({ path, line: lineNo, via: "bare-path" });
            }
        }
    }

    return deduplicateRefs(refs);
}
