import type { AnalyzerContext } from "../../types.ts";
import { looksLikePath } from "../shared/file-refs.ts";
import { BASH_COMMAND_RULES } from "./commands/mod.ts";

const GENERIC_COMMAND_RULE_ID = "shell-generic-command";

const CONTEXT_VERB_PATTERN =
    /\b(run|execute|invoke|call|terminal|shell|command|cmd|bash|zsh|sh)\b/i;

const CONTEXT_COMMAND_ALLOWLIST = new Set([
    "git",
    "gh",
    "npm",
    "pnpm",
    "yarn",
    "bun",
    "deno",
    "node",
    "python",
    "python3",
    "pip",
    "pip3",
    "docker",
    "docker-compose",
    "kubectl",
    "curl",
    "wget",
    "bd",
    "slab",
    "bash",
    "sh",
    "zsh",
]);

const SPECIFIC_COMMAND_RULES = BASH_COMMAND_RULES.filter((rule) =>
    rule.id !== GENERIC_COMMAND_RULE_ID
);

const KNOWN_COMMAND_TOOLS = new Set(
    SPECIFIC_COMMAND_RULES
        .map((rule) => String(rule.permission.tool ?? "").toLowerCase())
        .filter((tool) => tool && tool !== "detected"),
);

export function isLikelyInlineBashCommand(
    context: AnalyzerContext,
    input: { snippet: string; lineContext?: string },
): boolean {
    const snippet = normalizeInlineSnippet(input.snippet);
    if (!snippet) return false;
    if (looksLikeFormattingToken(snippet)) return false;
    const tokens = snippet.split(/\s+/).filter(Boolean);
    if (tokens.length === 1 && looksLikePath(snippet)) return false;

    if (matchesSpecificBashCommandRule(context, snippet)) return true;

    const firstToken = tokens[0]?.toLowerCase() ?? "";
    const hasContextVerb = CONTEXT_VERB_PATTERN.test(input.lineContext ?? "");
    const knownTool = firstToken &&
        (CONTEXT_COMMAND_ALLOWLIST.has(firstToken) || KNOWN_COMMAND_TOOLS.has(firstToken));

    if (tokens.length >= 2 && knownTool) {
        return true;
    }

    if (tokens.length === 1 && knownTool && hasContextVerb) {
        return true;
    }

    return false;
}

function matchesSpecificBashCommandRule(context: AnalyzerContext, snippet: string): boolean {
    const matches = context.astgrepClient.scanWithRules(snippet, "bash", SPECIFIC_COMMAND_RULES);
    return matches.length > 0;
}

function normalizeInlineSnippet(raw: string): string {
    return raw.trim().replace(/^`+/, "").replace(/`+$/, "").trim();
}

function looksLikeFormattingToken(snippet: string): boolean {
    if (!snippet) return true;
    if (/^[*]{1,2}[^*]+[*]{1,2}$/.test(snippet)) return true;
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(snippet)) return true;
    return false;
}
