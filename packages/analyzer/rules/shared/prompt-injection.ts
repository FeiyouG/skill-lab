export type PromptRegexRule = {
    id: string;
    pattern: RegExp;
};

export const PROMPT_REGEX_RULES: PromptRegexRule[] = [
    { id: "prompt-ignore-previous", pattern: /ignore previous instructions?/i },
    { id: "prompt-system-prompt", pattern: /system prompt/i },
    { id: "prompt-forget-rules", pattern: /forget (all )?(previous|earlier) rules/i },
];
