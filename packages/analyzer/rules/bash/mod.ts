import type { AstGrepRule } from "../../astgrep/client.ts";
import { FileTypeConfig } from "../../types.ts";
import { BASH_COMMAND_RULES } from "./commands/mod.ts";
import { BASH_DESTRUCTIVE_RULES } from "./destructive.ts";
import { extractBashFileRefs } from "./extractFileRefs.ts";
import { BASH_FILESYSTEM_RULES } from "./filesystem.ts";
import { BASH_INJECTION_RULES } from "./injection.ts";
import { BASH_NETWORK_RULES } from "./network.ts";
import { BASH_SECRET_DETECTION_RULES } from "./secret-detection.ts";

export const BASH_RULES: AstGrepRule[] = [
    ...BASH_NETWORK_RULES,
    ...BASH_FILESYSTEM_RULES,
    ...BASH_COMMAND_RULES,
    ...BASH_DESTRUCTIVE_RULES,
    ...BASH_INJECTION_RULES,
    ...BASH_SECRET_DETECTION_RULES,
];

export const BASH_FILETYPE_CONFIS: FileTypeConfig = {
    defaultLanguage: "bash",
    extractFileRefs: extractBashFileRefs,
};
