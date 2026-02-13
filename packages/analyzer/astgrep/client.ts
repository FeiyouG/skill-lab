import { parse, registerDynamicLanguage } from "@ast-grep/napi";
import * as bashRegistration from "@ast-grep/lang-bash";
import * as javascriptRegistration from "@ast-grep/lang-javascript";
import * as markdownRegistration from "@ast-grep/lang-markdown";
import * as pythonRegistration from "@ast-grep/lang-python";
import * as typescriptRegistration from "@ast-grep/lang-typescript";
import type {
    Finding,
    PermissionScope,
    Reference,
    ReferenceType,
    RuleRiskMapping,
} from "../types.ts";

export type AstGrepRule = {
    id: string;
    description: string;
    language: "javascript" | "typescript" | "python" | "bash" | "markdown";
    patterns: string[];
    permission: {
        tool: string;
        scope: PermissionScope;
        permission: string;
        metadata?: Record<string, string>;
        mappedRisks?: RuleRiskMapping[];
    };
};

export type AstGrepMatch = {
    ruleId: string;
    line: number;
    lineEnd?: number;
    extracted: Record<string, unknown>;
};

type ParsedNode = {
    range: () => {
        start: { line: number };
        end: { line: number };
    };
    getMatch: (name: string) => { text: () => string } | null;
};

type ParsedRoot = {
    root: () => {
        findAll: (pattern: string) => ParsedNode[];
    };
};

let isLanguageRegistryInitialized = false;

type DynamicLangRegistration = {
    libraryPath: string;
    extensions: string[];
    languageSymbol?: string;
    metaVarChar?: string;
    expandoChar?: string;
};

export function scanWithRules(
    content: string,
    language: AstGrepRule["language"],
    rules: AstGrepRule[],
): AstGrepMatch[] {
    ensureLanguageRegistry();
    const matches: AstGrepMatch[] = [];

    let root: ParsedRoot["root"];
    try {
        const ast = parse(language, content) as ParsedRoot;
        root = ast.root;
    } catch {
        for (const rule of rules) {
            for (const pattern of rule.patterns) {
                matches.push(...regexFallbackScan(content, pattern, rule));
            }
        }
        return matches;
    }

    for (const rule of rules) {
        for (const pattern of rule.patterns) {
            let nodes: ReturnType<ReturnType<typeof root>["findAll"]>;
            try {
                nodes = root().findAll(pattern);
            } catch {
                matches.push(...regexFallbackScan(content, pattern, rule));
                continue;
            }

            for (const node of nodes) {
                const range = node.range();
                const extracted: Record<string, unknown> = { pattern };

                if (rule.permission.metadata) {
                    for (const [key, metaVar] of Object.entries(rule.permission.metadata)) {
                        const varNode = node.getMatch(metaVar);
                        if (varNode) {
                            extracted[key] = stripQuotes(varNode.text());
                        }
                    }
                }

                matches.push({
                    ruleId: rule.id,
                    line: range.start.line + 1,
                    lineEnd: range.end.line + 1,
                    extracted,
                });
            }
        }
    }

    return matches;
}

export function matchesToFindings(
    file: string,
    type: ReferenceType,
    matches: AstGrepMatch[],
    referencedBy?: Reference,
): Finding[] {
    return matches.map((match) => ({
        ruleId: match.ruleId,
        reference: {
            file,
            line: match.line,
            lineEnd: match.lineEnd,
            type,
            referencedBy,
        },
        extracted: match.extracted,
    }));
}

function ensureLanguageRegistry(): void {
    if (isLanguageRegistryInitialized) return;
    registerDynamicLanguage({
        bash: bashRegistration.default as unknown as DynamicLangRegistration,
        javascript: javascriptRegistration.default as unknown as DynamicLangRegistration,
        typescript: typescriptRegistration.default as unknown as DynamicLangRegistration,
        python: pythonRegistration.default as unknown as DynamicLangRegistration,
        markdown: markdownRegistration.default as unknown as DynamicLangRegistration,
    });
    isLanguageRegistryInitialized = true;
}

function stripQuotes(value: string): string {
    return value
        .replace(/^['"`]/, "")
        .replace(/['"`]$/, "")
        .replace(/[;,)]+$/, "")
        .trim();
}

function regexFallbackScan(content: string, pattern: string, rule: AstGrepRule): AstGrepMatch[] {
    const compiled = compilePattern(pattern);
    if (!compiled) return [];

    const lines = content.split("\n");
    const matches: AstGrepMatch[] = [];

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const result = line.match(compiled.regex);
        if (!result) continue;

        const extracted: Record<string, unknown> = { pattern };
        for (let j = 0; j < compiled.variables.length; j += 1) {
            extracted[compiled.variables[j]] = stripQuotes(result[j + 1] ?? "");
        }

        if (rule.permission.metadata) {
            for (const [field, metaVar] of Object.entries(rule.permission.metadata)) {
                if (extracted[metaVar] !== undefined) {
                    extracted[field] = extracted[metaVar];
                }
            }
        }

        matches.push({
            ruleId: rule.id,
            line: i + 1,
            lineEnd: i + 1,
            extracted,
        });
    }

    return matches;
}

function compilePattern(pattern: string): { regex: RegExp; variables: string[] } | null {
    const variables: string[] = [];
    const source = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\$\\\$\\\$(\w+)/g, (_, name: string) => {
            variables.push(name);
            return "(.+)";
        })
        .replace(/\\\$(\w+)/g, (_, name: string) => {
            variables.push(name);
            return "([^\\s]+)";
        })
        .replace(/\s+/g, "\\s+");

    if (!source) return null;
    const startsWithWord = /^\w/.test(source);
    const endsWithWord = /\w$/.test(source);
    const prefix = startsWithWord ? "\\b" : "";
    const suffix = endsWithWord ? "\\b" : "";
    return { regex: new RegExp(`${prefix}${source}${suffix}`, "i"), variables };
}
