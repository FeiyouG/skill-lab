import { FILETYPE_BY_LANGUAGE } from "skill-lab/shared";
import type { AnalyzerContext, CodeBlock } from "../../types.ts";
import { MARKDOWN_INLINE_QUERY, MARKDOWN_NODE, MARKDOWN_QUERY } from "./astTypes.ts";
import type Parser from "tree-sitter";

type TsPoint = { row: number };
type TsNode = {
    type: string;
    text: string;
    startPosition: TsPoint;
    endPosition: TsPoint;
    children: TsNode[];
};

type TsCapture = { name: string; node: unknown };
type TsMatch = { captures: TsCapture[] };

/**
 * For markdown we use treesitter query directly
 * as AST-grep doesn't support inline markdown
 */
export async function extractCodeBlocks(
    context: AnalyzerContext,
    content: string,
): Promise<CodeBlock[]> {
    const blocks: CodeBlock[] = [];

    try {
        const blockTree = await context.treesitterClient.parse("markdown", content);

        const fencedBlockQuery = await context.treesitterClient.createQuery(
            "markdown",
            MARKDOWN_QUERY.FENCED_BLOCK,
        );

        for (const match of fencedBlockQuery.matches(blockTree.rootNode) as Parser.QueryMatch[]) {
            for (const capture of match.captures) {
                if (capture.name !== "block") continue;
                const blockNode = capture.node;

                const startLine = blockNode.startPosition.row + 1;
                const endLine = blockNode.endPosition.row + 1;

                const languageNode = blockNode.children.find((child) =>
                    child.type === MARKDOWN_NODE.CODE_FENCE_LANGUAGE ||
                    child.type === MARKDOWN_NODE.INFO_STRING
                );
                const fenceLanguage = FILETYPE_BY_LANGUAGE[
                    (languageNode?.text ?? "").trim().toLowerCase()
                ] ?? null;

                const contentNode = blockNode.children.find((child) =>
                    child.type === MARKDOWN_NODE.CODE_FENCE_CONTENT
                );
                const codeContent = (contentNode?.text ?? "")
                    .replace(/\n?[`~]{3,}[^\n]*\s*$/, "")
                    .trimEnd();
                if (!codeContent.trim()) continue;

                blocks.push({
                    language: fenceLanguage ?? "text",
                    content: codeContent,
                    startLine,
                    endLine,
                    type: "script",
                });
            }
        }

        const inlineNodeQuery = await context.treesitterClient.createQuery(
            "markdown",
            MARKDOWN_QUERY.INLINE,
        );
        const inlineParser = await context.treesitterClient.getParser("markdown-inline");
        const codeSpanQuery = await context.treesitterClient.createQuery(
            "markdown-inline",
            MARKDOWN_INLINE_QUERY.CODE_SPAN,
        );

        for (const inlineMatch of inlineNodeQuery.matches(blockTree.rootNode) as TsMatch[]) {
            for (const inlineCapture of inlineMatch.captures) {
                if (inlineCapture.name !== "inline") continue;
                const inlineNode = inlineCapture.node as TsNode;

                const inlineTree = inlineParser.parse(inlineNode.text);
                for (const codeMatch of codeSpanQuery.matches(inlineTree.rootNode) as TsMatch[]) {
                    for (const codeCapture of codeMatch.captures) {
                        if (codeCapture.name !== "code") continue;
                        const spanNode = codeCapture.node as TsNode;

                        const snippet = spanNode.text.replace(/^`+/, "").replace(/`+$/, "").trim();
                        if (!snippet || snippet.length > 200 || !/^[a-z]/i.test(snippet)) continue;

                        blocks.push({
                            language: "bash",
                            content: snippet,
                            startLine: inlineNode.startPosition.row + 1,
                            endLine: inlineNode.startPosition.row + 1,
                            type: "inline",
                        });
                    }
                }
            }
        }
    } catch (error) {
        throw new Error(`Failed to extract code blocks from markdown: ${error}`);
    }

    return blocks;
}
