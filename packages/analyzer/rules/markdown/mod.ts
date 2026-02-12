import type { AstGrepRule } from "../../astgrep/client.ts";
import type { FileType } from "../../types.ts";
import { extractCodeBlocks } from "./extractCodeBlocks.ts";

export const MARKDOWN_RULES: AstGrepRule[] = [];

export const MARKDOWN_FILETYPE_CONFIG = {
    extractCodeBlocks,
    defaultLanguage: "markdown" as FileType,
};
