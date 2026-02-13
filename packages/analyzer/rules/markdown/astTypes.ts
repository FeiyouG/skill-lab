/** ast-grep node types for the Markdown block grammar (@ast-grep/lang-markdown). */
export const MARKDOWN_NODE = {
    CODE_FENCE_BLOCK: "fenced_code_block",
    CODE_FENCE_CONTENT: "code_fence_content",
    CODE_FENCE_LANGUAGE: "language",
    INFO_STRING: "info_string",
    PARAGRAPH: "paragraph",
    INLINE: "inline",
} as const;

/** tree-sitter node types for the Markdown inline grammar ("markdown-inline"). */
export const MARKDOWN_INLINE_NODE = {
    INLINE_LINK: "inline_link",
    LINK_DESTINATION: "link_destination",
    CODE_SPAN: "code_span",
    TEXT: "text",
} as const;

/**
 * Pre-built tree-sitter S-expression query strings for the Markdown inline grammar.
 * Pass these to treesitterClient.createQuery("markdown-inline", …) — results are cached
 * by TreesitterClient so compilation happens only once per client instance.
 */
export const MARKDOWN_INLINE_QUERY = {
    INLINE_LINK_DEST:
        `(${MARKDOWN_INLINE_NODE.INLINE_LINK} (${MARKDOWN_INLINE_NODE.LINK_DESTINATION}) @dest)`,
    CODE_SPAN: `(${MARKDOWN_INLINE_NODE.CODE_SPAN}) @code`,
    TEXT: `(${MARKDOWN_INLINE_NODE.TEXT}) @text`,
} as const;

/** tree-sitter query strings for the Markdown block grammar ("markdown"). */
export const MARKDOWN_QUERY = {
    FENCED_BLOCK: `(${MARKDOWN_NODE.CODE_FENCE_BLOCK}) @block`,
    INLINE: `(${MARKDOWN_NODE.INLINE}) @inline`,
} as const;
