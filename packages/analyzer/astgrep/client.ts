import { parse, registerDynamicLanguage } from "@ast-grep/napi";
import type {
    Finding,
    PermissionScope,
    Reference,
    ReferenceType,
    RuleRiskMapping,
} from "skill-lab/shared";
import {
    type AstGrepGrammar,
    buildBundledRegistrations,
    buildDevRegistrations,
} from "./registry.ts";

export type AstGrepRule = {
    id: string;
    description: string;
    grammar: AstGrepGrammar;
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

export class AstGrepClient {
    private isLanguageRegistryInitialized = false;
    private PARSE_CACHE_BY_GRAMMAR: Partial<
        Record<
            AstGrepRule["grammar"] | "markdown",
            Map<number, Map<number, ReturnType<typeof parse>>>
        >
    > = {};

    /** Parse content for direct AST traversal using kind/composite rules. */
    public parse(
        language: AstGrepRule["grammar"] | "markdown",
        content: string,
    ): ReturnType<typeof parse> {
        this.ensureLanguageRegistry();
        const rootByLen = this.getParseCache(language);
        const len = content.length;
        const rootByHash = rootByLen.get(len);
        if (rootByHash) {
            const hash = this.hashContent(content);
            const cached = rootByHash.get(hash);
            if (cached) return cached;
        }

        const ast = parse(language, content);
        const hash = this.hashContent(content);
        const bucket = rootByLen.get(len) ?? new Map<number, ReturnType<typeof parse>>();
        bucket.set(hash, ast);
        rootByLen.set(len, bucket);

        return ast;
    }

    public scanWithRules(
        content: string,
        language: AstGrepRule["grammar"],
        rules: AstGrepRule[],
    ): AstGrepMatch[] {
        this.ensureLanguageRegistry();
        const matches: AstGrepMatch[] = [];

        try {
            const ast = this.parse(language, content);
            const root = ast.root();

            for (const rule of rules) {
                for (const pattern of rule.patterns) {
                    const nodes = root.findAll(pattern);

                    for (const node of nodes) {
                        const range = node.range();
                        const extracted: Record<string, unknown> = { pattern };

                        if (rule.permission.metadata) {
                            for (const [key, metaVar] of Object.entries(rule.permission.metadata)) {
                                const varNode = node.getMatch(metaVar);
                                if (varNode) {
                                    extracted[key] = this.stripQuotes(varNode.text());
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
        } catch (error) {
            throw new Error(`Failed to match rules: ${error}`);
        }

        return matches;
    }

    public matchesToFindings(
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

    private ensureLanguageRegistry(): void {
        if (this.isLanguageRegistryInitialized) return;

        const bundledResourceDir = Deno.env.get("SKILL_LAB_AST_GREP_RESOURCES_DIR");
        const registrations = bundledResourceDir
            ? buildBundledRegistrations(bundledResourceDir)
            : buildDevRegistrations();

        registerDynamicLanguage(registrations);
        this.isLanguageRegistryInitialized = true;
    }

    private stripQuotes(value: string): string {
        return value
            .replace(/^['"`]/, "")
            .replace(/['"`]$/, "")
            .replace(/[;,)]+$/, "")
            .trim();
    }

    private getParseCache(
        language: AstGrepRule["grammar"] | "markdown",
    ): Map<number, Map<number, ReturnType<typeof parse>>> {
        if (!this.PARSE_CACHE_BY_GRAMMAR[language]) {
            this.PARSE_CACHE_BY_GRAMMAR[language] = new Map<
                number,
                Map<number, ReturnType<typeof parse>>
            >();
        }
        return this.PARSE_CACHE_BY_GRAMMAR[language]!;
    }

    private hashContent(content: string): number {
        // FNV-1a 32-bit (fast, non-cryptographic)
        let hash = 0x811c9dc5;
        for (let i = 0; i < content.length; i++) {
            hash ^= content.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193);
        }
        return hash >>> 0;
    }
}
