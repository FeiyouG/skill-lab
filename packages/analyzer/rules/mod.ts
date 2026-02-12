import { BASH_RULES } from "./bash/mod.ts";
import { JAVASCRIPT_RULES } from "./javascript/mod.ts";
import { MARKDOWN_FILETYPE_CONFIG, MARKDOWN_RULES } from "./markdown/mod.ts";
import { PYTHON_RULES } from "./python/mod.ts";
import { SHARED_PATTERNS } from "./shared/common.ts";
import { PROMPT_REGEX_RULES } from "./shared/prompt-injection.ts";
import { TEXT_FILETYPE_CONFIG, TEXT_RULES } from "./text/mod.ts";
import { TYPESCRIPT_RULES } from "./typescript/mod.ts";
import type { FileType } from "../types.ts";
import type { AstGrepRule } from "../astgrep/client.ts";

// Single registry used for both file-level scanning and code-block scanning.
export const RULES_BY_FILETYPE: Partial<Record<FileType, readonly AstGrepRule[]>> = {
    markdown: MARKDOWN_RULES,
    text: TEXT_RULES,
    bash: BASH_RULES,
    javascript: JAVASCRIPT_RULES,
    typescript: TYPESCRIPT_RULES,
    python: PYTHON_RULES,
} as const;

export const FILETYPE_CONFIGS = {
    markdown: MARKDOWN_FILETYPE_CONFIG,
    text: TEXT_FILETYPE_CONFIG,
} as const;

export { SHARED_PATTERNS };
export { PROMPT_REGEX_RULES };
