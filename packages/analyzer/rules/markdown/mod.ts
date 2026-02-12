import type { AstGrepRule } from "../../astgrep/client.ts";

export const MARKDOWN_RULES: AstGrepRule[] = [];

// Markdown files can embed executable code blocks.
export const MARKDOWN_FILETYPE_CONFIG = {
    extractCodeBlocks: true,
    defaultCodeBlockLanguage: "bash",
};
