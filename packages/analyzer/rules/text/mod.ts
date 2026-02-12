import type { AstGrepRule } from "../../astgrep/client.ts";

export const TEXT_RULES: AstGrepRule[] = [];

// Plain text files are treated like markdown for command/code examples.
export const TEXT_FILETYPE_CONFIG = {
    extractCodeBlocks: true,
    defaultCodeBlockLanguage: "bash",
};
