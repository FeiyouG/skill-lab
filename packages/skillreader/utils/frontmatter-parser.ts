type SyntaxNodeLike = {
    type: string;
    text: string;
    startPosition: { row: number };
    endPosition: { row: number };
    children: SyntaxNodeLike[];
};

export type FrontmatterInfo = {
    content: string;
    startLine: number;
    endLine: number;
};

let parserInstance: {
    parse: (input: string) => { rootNode: SyntaxNodeLike };
} | null = null;

export async function extractFrontmatter(content: string): Promise<FrontmatterInfo | null> {
    try {
        const parser = await getParser();
        const tree = parser.parse(content);
        const frontmatterNode = findFrontmatterNode(tree.rootNode);
        if (!frontmatterNode) return null;

        const matched = frontmatterNode.text.match(/^---\n([\s\S]*?)\n---/);
        if (!matched) return null;

        return {
            content: matched[1],
            startLine: frontmatterNode.startPosition.row + 1,
            endLine: frontmatterNode.endPosition.row + 1,
        };
    } catch {
        const matched = content.match(/^---\n([\s\S]*?)\n---/);
        if (!matched) return null;
        return {
            content: matched[1],
            startLine: 1,
            endLine: matched[0].split("\n").length,
        };
    }
}

function findFrontmatterNode(node: SyntaxNodeLike): SyntaxNodeLike | null {
    if (node.type.includes("yaml") && node.startPosition.row === 0) {
        return node;
    }
    for (const child of node.children) {
        const found = findFrontmatterNode(child);
        if (found) return found;
    }
    return null;
}

async function getParser(): Promise<{ parse: (input: string) => { rootNode: SyntaxNodeLike } }> {
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
