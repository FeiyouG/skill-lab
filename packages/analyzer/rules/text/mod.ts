import type { AstGrepRule } from "../../astgrep/client.ts";
import { FileTypeConfig } from "../../types.ts";
import { extractCodeBlocks } from "../markdown/extractCodeBlocks.ts";
import { extractMarkdownFileRefs } from "../markdown/extractFileRefs.ts";

export const TEXT_RULES: AstGrepRule[] = [];

export const TEXT_FILETYPE_CONFIG: FileTypeConfig = {
    extractCodeBlocks,
    defaultLanguage: "markdown",
    extractFileRefs: extractMarkdownFileRefs,
};
