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
    type: ReferenceType;
};

export async function extractCodeBlocks(content: string, fileType: FileType): Promise<CodeBlock[]> {
    const defaultLanguage: FileType = fileType === "text" ? "markdown" : fileType;

    const blocks: CodeBlock[] = [{
        language: defaultLanguage,
        content,
        startLine: 1,
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

            blocks.push({
                language: fenceLanguage ?? "bash",
                content: codeContent,
                startLine: block.startPosition.row + 1,
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
                type: "inline",
            });
        }
    } catch {
        // Whole-file block already included.
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
