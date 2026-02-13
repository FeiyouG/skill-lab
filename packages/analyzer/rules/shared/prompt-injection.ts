import type { RuleRiskMapping } from "../../types.ts";

export type PromptRegexRule = {
    id: string;
    pattern: RegExp;
    mappedRisks?: RuleRiskMapping[];
};

export const PROMPT_REGEX_RULES: PromptRegexRule[] = [
    {
        id: "prompt-ignore-previous",
        pattern: /ignore previous instructions?/i,
        mappedRisks: [{
            code: "PROMPT:prompt_override",
            severity: "critical",
            message: "Prompt override attempt detected",
        }],
    },
    {
        id: "prompt-forget-rules",
        pattern: /forget (all )?(previous|earlier) rules/i,
        mappedRisks: [{
            code: "PROMPT:prompt_override",
            severity: "critical",
            message: "Prompt override attempt detected",
        }],
    },
    {
        id: "prompt-reveal-system-prompt",
        pattern:
            /(reveal|show|print|dump|leak|disclose|output)\b[\s\S]{0,80}\b(system prompt|hidden instructions?)/i,
        mappedRisks: [{
            code: "PROMPT:prompt_override",
            severity: "warning",
            message: "Prompt override attempt detected",
        }],
    },
    {
        id: "prompt-ignore-and-reveal",
        pattern:
            /\b(ignore|forget)\b[\s\S]{0,80}\b(previous|earlier)\b[\s\S]{0,80}\b(instructions?|rules?|system prompt)/i,
        mappedRisks: [{
            code: "PROMPT:prompt_override",
            severity: "critical",
            message: "Prompt override attempt detected",
        }],
    },
];
