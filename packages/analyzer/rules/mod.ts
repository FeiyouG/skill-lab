import { BASH_RULES } from "./bash/mod.ts";
import { extractBashFileRefs } from "./bash/extractFileRefs.ts";
import { JAVASCRIPT_RULES } from "./javascript/mod.ts";
import { extractJsFileRefs } from "./javascript/extractFileRefs.ts";
import { MARKDOWN_FILETYPE_CONFIG, MARKDOWN_RULES } from "./markdown/mod.ts";
import { extractMarkdownFileRefs } from "./markdown/extractFileRefs.ts";
import { PYTHON_RULES } from "./python/mod.ts";
import { extractPythonFileRefs } from "./python/extractFileRefs.ts";
import { SHARED_PATTERNS } from "./shared/common.ts";
import { PROMPT_REGEX_RULES } from "./shared/prompt-injection.ts";
import type { FileRefDiscovery } from "./shared/file-refs.ts";
import { TEXT_FILETYPE_CONFIG, TEXT_RULES } from "./text/mod.ts";
import { TYPESCRIPT_RULES } from "./typescript/mod.ts";
import type { FileType } from "../types.ts";
import type { AstGrepRule } from "../astgrep/client.ts";
import type { CodeBlock } from "./markdown/extractCodeBlocks.ts";

// Single registry used for both file-level scanning and code-block scanning.
export const RULES_BY_FILETYPE: Partial<Record<FileType, readonly AstGrepRule[]>> = {
    markdown: MARKDOWN_RULES,
    text: TEXT_RULES,
    bash: BASH_RULES,
    javascript: JAVASCRIPT_RULES,
    typescript: TYPESCRIPT_RULES,
    python: PYTHON_RULES,
} as const;

export const FILETYPE_CONFIGS: Partial<
    Record<FileType, {
        extractCodeBlocks?: (content: string, fileType: FileType) => Promise<CodeBlock[]>;
        extractFileRefs?: (content: string) => FileRefDiscovery[] | Promise<FileRefDiscovery[]>;
        defaultLanguage: FileType | null;
    }>
> = {
    markdown: { ...MARKDOWN_FILETYPE_CONFIG, extractFileRefs: extractMarkdownFileRefs },
    text: { ...TEXT_FILETYPE_CONFIG, extractFileRefs: extractMarkdownFileRefs },
    bash: { defaultLanguage: "bash", extractFileRefs: extractBashFileRefs },
    javascript: { defaultLanguage: "javascript", extractFileRefs: extractJsFileRefs },
    typescript: { defaultLanguage: "typescript", extractFileRefs: extractJsFileRefs },
    python: { defaultLanguage: "python", extractFileRefs: extractPythonFileRefs },
    json: { defaultLanguage: null },
    yaml: { defaultLanguage: null },
    binary: { defaultLanguage: null },
    unknown: { defaultLanguage: null },
} as const;

export { SHARED_PATTERNS };
export { PROMPT_REGEX_RULES };
export type { FileRefDiscovery };
