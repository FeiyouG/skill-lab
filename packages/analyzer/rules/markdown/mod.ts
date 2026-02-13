import type { AstGrepRule } from "../../astgrep/client.ts";
import { extractCodeBlocks } from "./extractCodeBlocks.ts";
import { FileTypeConfig } from "../../types.ts";
import { extractMarkdownFileRefs } from "./extractFileRefs.ts";

export const MARKDOWN_RULES: AstGrepRule[] = [];

export const MARKDOWN_FILETYPE_CONFIG: FileTypeConfig = {
    extractCodeBlocks,
    defaultLanguage: "markdown",
    extractFileRefs: extractMarkdownFileRefs,
};
