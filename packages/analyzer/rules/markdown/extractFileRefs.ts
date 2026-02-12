/**
 * Tree-sitter-based file reference extractor for Markdown content.
 *
 * Extracts file path references using the parsed AST so that:
 * - Fenced code block content is skipped entirely (prevents false positives
 *   from directory tree examples, code snippets, etc.)
 * - Markdown links [text](path) are tagged as "markdown-link"
 * - Inline code tokens `cmd path` are tagged as "inline-code"
 * - Bare paths in prose text are tagged as "bare-path"
 */

import {
    BARE_PATH_PATTERN,
    type FileRefDiscovery,
    isUrl,
    looksLikePath,
} from "../shared/file-refs.ts";

type SyntaxNodeLike = {
    type: string;
    text: string;
    startPosition: { row: number };
    children: SyntaxNodeLike[];
};

let parserInstance: { parse: (content: string) => { rootNode: SyntaxNodeLike } } | null = null;

async function getParser(): Promise<
    { parse: (content: string) => { rootNode: SyntaxNodeLike } }
> {
    if (parserInstance) return parserInstance;

    const [{ default: Parser }, markdownModule] = await Promise.all([
        import("tree-sitter"),
        import("@tree-sitter-grammars/tree-sitter-markdown"),
    ]);

    const parser = new Parser();
    parser.setLanguage(
        ((markdownModule as { default?: unknown }).default ?? markdownModule) as Parameters<
            typeof parser.setLanguage
        >[0],
    );

    parserInstance = parser;
    return parser;
}

/**
 * Extracts file references from Markdown content using tree-sitter.
 * Skips fenced code block content to avoid false positives from example code.
 *
 * Falls back to regex-based extraction if tree-sitter is unavailable.
 */
export async function extractMarkdownFileRefs(content: string): Promise<FileRefDiscovery[]> {
    try {
        const parser = await getParser();
        const tree = parser.parse(content);
        const refs: FileRefDiscovery[] = [];

        walkNode(tree.rootNode, refs, false);

        return deduplicateRefs(refs);
    } catch {
        // Fallback to regex-based extraction if tree-sitter is unavailable
        return extractMarkdownFileRefsRegex(content);
    }
}

/**
 * Recursively walks the markdown AST collecting file references.
 * @param node - current AST node
 * @param refs - accumulator
 * @param inFencedBlock - whether we are currently inside a fenced code block
 */
function walkNode(
    node: SyntaxNodeLike,
    refs: FileRefDiscovery[],
    inFencedBlock: boolean,
): void {
    // Skip fenced code block content entirely
    if (node.type === "fenced_code_block") {
        return;
    }

    // Inline code spans: `command arg` — check non-first tokens for paths
    if (node.type === "code_span") {
        if (!inFencedBlock) {
            extractFromInlineCode(node, refs);
        }
        return;
    }

    // Inline links: [text](url_or_path)
    if (node.type === "inline_link" || node.type === "link") {
        if (!inFencedBlock) {
            extractFromLink(node, refs);
        }
        return;
    }

    // Autolinks: <https://...> or <path>
    if (node.type === "uri_autolink" || node.type === "email_autolink") {
        // URLs in autolinks — skip (not skill file refs)
        return;
    }

    // Text in paragraphs and other prose: scan for bare paths
    if ((node.type === "text" || node.type === "paragraph") && !inFencedBlock) {
        if (node.type === "text") {
            extractBarePathsFromText(node, refs);
        }
    }

    // Recurse into children
    for (const child of node.children) {
        walkNode(child, refs, inFencedBlock);
    }
}

function extractFromLink(node: SyntaxNodeLike, refs: FileRefDiscovery[]): void {
    // Find the link_destination child node
    const dest = findChildByType(node, "link_destination");
    if (!dest) return;

    const path = dest.text.trim();
    if (!path || isUrl(path)) return;
    // Skip anchor links
    if (path.startsWith("#")) return;

    refs.push({
        path,
        line: node.startPosition.row + 1,
        via: "markdown-link",
    });
}

function extractFromInlineCode(node: SyntaxNodeLike, refs: FileRefDiscovery[]): void {
    // Strip backticks from code span text
    const snippet = node.text.replace(/^`+/, "").replace(/`+$/, "").trim();
    if (!snippet) return;

    const parts = snippet.split(/\s+/);
    for (let pi = 0; pi < parts.length; pi++) {
        const part = parts[pi];
        // Skip first token if it's a bare command word (no slash, no extension)
        if (pi === 0 && !part.includes("/") && !part.includes(".")) continue;
        if (looksLikePath(part) && !isUrl(part)) {
            refs.push({
                path: part,
                line: node.startPosition.row + 1,
                via: "inline-code",
            });
        }
    }
}

function extractBarePathsFromText(node: SyntaxNodeLike, refs: FileRefDiscovery[]): void {
    const text = node.text;
    const lineOffset = node.startPosition.row;

    // Reset lastIndex before using global regex
    BARE_PATH_PATTERN.lastIndex = 0;

    for (const match of text.matchAll(BARE_PATH_PATTERN)) {
        const path = match[0].trim();
        if (!path || isUrl(path)) continue;
        if (!looksLikePath(path)) continue;

        // Calculate line number within the node's text
        const textBefore = text.slice(0, match.index ?? 0);
        const linesBeforeMatch = textBefore.split("\n").length - 1;

        refs.push({
            path,
            line: lineOffset + linesBeforeMatch + 1,
            via: "bare-path",
        });
    }
}

function findChildByType(node: SyntaxNodeLike, type: string): SyntaxNodeLike | undefined {
    return node.children.find((child) => child.type === type);
}

/**
 * Deduplicate refs, preferring higher-specificity discovery methods.
 * Priority: markdown-link > inline-code > bare-path
 * If the same path is found via multiple methods on the same line,
 * only the highest-priority entry is kept.
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

    // Group by path+line, keep only the highest priority via
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
 * Regex-based fallback for when tree-sitter is unavailable.
 * Uses line-by-line scanning with fenced block tracking via simple regex.
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

        // Track fenced code block boundaries
        if (/^[ \t]*(`{3,}|~{3,})/.test(line)) {
            inFencedBlock = !inFencedBlock;
            continue;
        }
        if (inFencedBlock) continue;

        // Markdown links
        markdownLink.lastIndex = 0;
        for (const match of line.matchAll(markdownLink)) {
            const path = match[1]?.trim();
            if (path && !isUrl(path) && !path.startsWith("#")) {
                refs.push({ path, line: lineNo, via: "markdown-link" });
            }
        }

        // Inline code — check all tokens for path-like values
        // The first token is included if it looks like a path (e.g. `scripts/extract.py`)
        // rather than a simple command name (e.g. `git`). Subsequent tokens are always checked.
        inlineCode.lastIndex = 0;
        for (const match of line.matchAll(inlineCode)) {
            const parts = match[1].trim().split(/\s+/);
            for (let pi = 0; pi < parts.length; pi++) {
                const part = parts[pi];
                // Skip first token if it's a bare command word (no slash, no extension)
                if (pi === 0 && !part.includes("/") && !part.includes(".")) continue;
                if (looksLikePath(part) && !isUrl(part)) {
                    refs.push({ path: part, line: lineNo, via: "inline-code" });
                }
            }
        }

        // Bare paths — scan the line with markdown link syntax masked out
        // to avoid re-picking up paths already found as markdown links,
        // and to avoid picking up URLs from link destinations.
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
