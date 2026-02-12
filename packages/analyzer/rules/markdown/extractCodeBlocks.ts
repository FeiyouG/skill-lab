import type { FileType, ReferenceType } from "../../types.ts";

type SyntaxNodeLike = {
    type: string;
    text: string;
    startPosition: { row: number };
    children: SyntaxNodeLike[];
};

let parserInstance: { parse: (content: string) => { rootNode: SyntaxNodeLike } } | null = null;

export type CodeBlock = {
    language: FileType;
    content: string;
    startLine: number;
    endLine: number;
    type: ReferenceType;
};

export async function extractCodeBlocks(content: string, fileType: FileType): Promise<CodeBlock[]> {
    const defaultLanguage: FileType = fileType === "text" ? "markdown" : fileType;

    const blocks: CodeBlock[] = [{
        language: defaultLanguage,
        content,
        startLine: 1,
        endLine: Math.max(1, content.split("\n").length),
        type: "content",
    }];

    try {
        const parser = await getParser();
        const tree = parser.parse(content);
        const fencedBlocks = collectByType(tree.rootNode, "fenced_code_block");

        for (const block of fencedBlocks) {
            const infoNode = block.children.find((child) => child.type.includes("info"));
            const codeNodes = block.children.filter((child) =>
                child.type.includes("code_fence_content")
            );
            if (codeNodes.length === 0) continue;

            const fenceLanguage = detectLanguageFromFence(infoNode?.text ?? "");
            const codeContent = codeNodes.map((node) => node.text).join("\n").trimEnd();
            if (!codeContent.trim()) continue;

            const contentStartLine = codeNodes[0]?.startPosition.row + 1;
            const endLine = contentStartLine + codeContent.split("\n").length - 1;

            blocks.push({
                language: fenceLanguage ?? "bash",
                content: codeContent,
                startLine: contentStartLine,
                endLine,
                type: "script",
            });
        }

        const inlineNodes = collectByType(tree.rootNode, "code_span");
        for (const node of inlineNodes) {
            const snippet = node.text.replace(/^`+/, "").replace(/`+$/, "").trim();
            if (!snippet || snippet.length > 200 || !/^[a-z]/i.test(snippet)) continue;
            blocks.push({
                language: "bash",
                content: snippet,
                startLine: node.startPosition.row + 1,
                endLine: node.startPosition.row + 1,
                type: "inline",
            });
        }
    } catch {
        blocks.push(...extractCodeBlocksFallback(content));
    }

    return blocks;
}

function extractCodeBlocksFallback(content: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = content.split("\n");
    let inFence = false;
    let fenceDelimiter = "";
    let fenceLanguage = "";
    let fenceStartLine = 0;
    const fenceContent: string[] = [];

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const lineNo = i + 1;
        const openMatch = line.match(/^\s*(`{3,}|~{3,})\s*([a-zA-Z0-9_-]+)?\s*$/);

        if (!inFence && openMatch) {
            inFence = true;
            fenceDelimiter = openMatch[1][0];
            fenceLanguage = openMatch[2] ?? "";
            fenceStartLine = lineNo + 1;
            fenceContent.length = 0;
            continue;
        }

        if (inFence && line.match(new RegExp(`^\\s*${fenceDelimiter}{3,}\\s*$`))) {
            const codeContent = fenceContent.join("\n").trimEnd();
            if (codeContent.trim()) {
                const language = detectLanguageFromFence(fenceLanguage) ?? "bash";
                const endLine = fenceStartLine + codeContent.split("\n").length - 1;
                blocks.push({
                    language,
                    content: codeContent,
                    startLine: fenceStartLine,
                    endLine,
                    type: "script",
                });
            }
            inFence = false;
            fenceDelimiter = "";
            fenceLanguage = "";
            fenceStartLine = 0;
            fenceContent.length = 0;
            continue;
        }

        if (inFence) {
            fenceContent.push(line);
        }
    }

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const lineNo = i + 1;
        for (const match of line.matchAll(/`([^`\n]{1,200})`/g)) {
            const snippet = match[1].trim();
            if (!snippet || !/^[a-z]/i.test(snippet)) continue;
            blocks.push({
                language: "bash",
                content: snippet,
                startLine: lineNo,
                endLine: lineNo,
                type: "inline",
            });
        }
    }

    return blocks;
}

function collectByType(node: SyntaxNodeLike, targetType: string): SyntaxNodeLike[] {
    const results: SyntaxNodeLike[] = [];
    if (node.type === targetType) results.push(node);
    for (const child of node.children) {
        results.push(...collectByType(child, targetType));
    }
    return results;
}

function detectLanguageFromFence(raw: string): FileType | null {
    const lower = raw.trim().toLowerCase();
    if (!lower) return null;

    const aliasToFileType: Record<string, FileType> = {
        bash: "bash",
        sh: "bash",
        shell: "bash",
        zsh: "bash",
        js: "javascript",
        javascript: "javascript",
        mjs: "javascript",
        cjs: "javascript",
        ts: "typescript",
        typescript: "typescript",
        py: "python",
        python: "python",
        md: "markdown",
        markdown: "markdown",
        text: "text",
    };

    return aliasToFileType[lower] ?? null;
}

async function getParser(): Promise<{ parse: (content: string) => { rootNode: SyntaxNodeLike } }> {
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
