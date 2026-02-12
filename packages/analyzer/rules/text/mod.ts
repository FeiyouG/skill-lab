import type { AstGrepRule } from "../../astgrep/client.ts";
import type { FileType } from "../../types.ts";
import { extractCodeBlocks } from "../markdown/extractCodeBlocks.ts";

export const TEXT_RULES: AstGrepRule[] = [];

export const TEXT_FILETYPE_CONFIG = {
    extractCodeBlocks,
    defaultLanguage: "markdown" as FileType,
};
