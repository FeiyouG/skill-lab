import { BASH_FILETYPE_CONFIS, BASH_RULES } from "./bash/mod.ts";
import {
    JAVASCRIPT_FILETYPE_CONFIGS,
    JAVASCRIPT_RULES,
    TYPESCRIPT_FILETYPE_CONFIGS,
} from "./javascript/mod.ts";
import { MARKDOWN_FILETYPE_CONFIG, MARKDOWN_RULES } from "./markdown/mod.ts";
import { PYTHON_RULES, PYTHONG_FILETYPE_CONFIGS } from "./python/mod.ts";
import { PROMPT_REGEX_RULES } from "./shared/prompt-injection.ts";
import type { FileRefDiscovery, FileTypeConfig } from "../types.ts";
import { TEXT_FILETYPE_CONFIG, TEXT_RULES } from "./text/mod.ts";
import { TYPESCRIPT_RULES } from "./typescript/mod.ts";
import type { FileType, RuleRiskInput, RuleRiskResult } from "skill-lab/shared";
import type { AstGrepRule } from "../astgrep/client.ts";
import type { PromptRegexRule } from "./shared/prompt-injection.ts";

// Single registry used for both file-level scanning and code-block scanning.
export const RULES_BY_FILETYPE: Partial<Record<FileType, readonly AstGrepRule[]>> = {
    markdown: MARKDOWN_RULES,
    text: TEXT_RULES,
    bash: BASH_RULES,
    javascript: JAVASCRIPT_RULES,
    typescript: TYPESCRIPT_RULES,
    python: PYTHON_RULES,
} as const;

export const FILETYPE_CONFIGS: Record<FileType, FileTypeConfig> = {
    markdown: MARKDOWN_FILETYPE_CONFIG,
    text: TEXT_FILETYPE_CONFIG,
    bash: BASH_FILETYPE_CONFIS,
    javascript: JAVASCRIPT_FILETYPE_CONFIGS,
    typescript: TYPESCRIPT_FILETYPE_CONFIGS,
    python: PYTHONG_FILETYPE_CONFIGS,
    csv: { defaultLanguage: null },
    json: { defaultLanguage: null },
    yaml: { defaultLanguage: null },
    toml: { defaultLanguage: null },
    config: { defaultLanguage: null },
    sql: { defaultLanguage: null },
    xml: { defaultLanguage: null },
    binary: { defaultLanguage: null },
    unknown: { defaultLanguage: null },
} as const;

export { PROMPT_REGEX_RULES };
export type { FileRefDiscovery };

export type RiskRuleDefinition = AstGrepRule | PromptRegexRule;

export const RULES_BY_ID: Map<string, RiskRuleDefinition> = new Map(
    [
        ...Object.values(RULES_BY_FILETYPE).flatMap((rules) => rules ?? []),
        ...PROMPT_REGEX_RULES,
    ].map((rule) => [rule.id, rule] as const),
);

export function evalRuleRiskMappings(
    rule: RiskRuleDefinition,
    input: RuleRiskInput,
): RuleRiskResult[] {
    const entries = "permission" in rule
        ? (rule.permission.mappedRisks ?? [])
        : (rule.mappedRisks ?? []);
    const results: RuleRiskResult[] = [];

    for (const entry of entries) {
        if (typeof entry === "function") {
            const value = entry(input);
            if (!value) continue;
            results.push(...(Array.isArray(value) ? value : [value]));
            continue;
        }
        results.push(entry);
    }

    return results;
}
