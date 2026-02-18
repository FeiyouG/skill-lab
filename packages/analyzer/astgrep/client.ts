import { initializeTreeSitter, parse, registerDynamicLanguage } from "@ast-grep/wasm";
import type {
    Finding,
    PermissionScope,
    Reference,
    ReferenceType,
    RuleRiskMapping,
} from "skill-lab/shared";
import { ensureGrammar } from "../treesitter/registry.ts";
import type { DownloadProgressEvent, TreesitterGrammar } from "../treesitter/registry.ts";
import type { AnalyzerLogger, AnalyzerLogLevel } from "../types.ts";

export type AstGrepGrammar = Exclude<TreesitterGrammar, "markdown" | "markdown-inline" | "tsx">;

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

type SgRoot = ReturnType<typeof parse>;
type SgRootCache = Map<number, Map<number, SgRoot>>;

type ClientLogContext = {
    logger?: AnalyzerLogger;
    logLevel?: AnalyzerLogLevel;
};

export class AstGrepClient {
    private REGISTERED_GRAMMARS = new Set<AstGrepGrammar>();
    private SG_ROOT_CACHE_BY_CONTENT: Partial<Record<AstGrepGrammar, SgRootCache>> = {};

    /** Lazy runtime init promise — created on first use, shared across all calls. */
    private parserInitialized: boolean = false;
    private readonly logContext: ClientLogContext;
    private onDownloadProgress?: (event: DownloadProgressEvent) => void;

    constructor(logContext: ClientLogContext = {}) {
        this.logContext = logContext;
    }

    /** Set/clear the download progress callback (wired by step 001 to MultiProgressBar). */
    public setOnDownloadProgress(cb?: (event: DownloadProgressEvent) => void): void {
        this.onDownloadProgress = cb;
    }

    /** Parse content for direct AST traversal using kind/composite rules. */
    public async parse(
        language: AstGrepGrammar,
        content: string,
    ): Promise<SgRoot> {
        await this.ensureLanguageRegistered(language);
        const sgRootByLen = this.getSgRootCache(language);
        const len = content.length;
        const rootByHash = sgRootByLen.get(len);
        if (rootByHash) {
            const hash = this.hashContent(content);
            const cached = rootByHash.get(hash);
            if (cached) return cached;
        }

        const sgRoot = parse(language, content);
        const hash = this.hashContent(content);
        const bucket = sgRootByLen.get(len) ?? new Map<number, SgRoot>();
        bucket.set(hash, sgRoot);
        sgRootByLen.set(len, bucket);

        return sgRoot;
    }

    public async scanWithRules(
        content: string,
        language: AstGrepGrammar,
        rules: AstGrepRule[],
    ): Promise<AstGrepMatch[]> {
        await this.ensureLanguageRegistered(language);
        const matches: AstGrepMatch[] = [];

        try {
            const ast = await this.parse(language, content);
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

    /** Initializes the ast-grep runtime once (without registering grammars yet). */
    private async ensureRuntimeInit() {
        if (this.parserInitialized) return;

        await initializeTreeSitter();
    }

    /** Lazily register a single grammar the first time it is needed. */
    private async ensureLanguageRegistered(language: AstGrepGrammar) {
        if (this.REGISTERED_GRAMMARS.has(language)) return;

        await this.ensureRuntimeInit();
        const wasmPath = await ensureGrammar(language, {
            ...this.logContext,
            onDownloadProgress: this.onDownloadProgress,
        });
        await registerDynamicLanguage({ [language]: { libraryPath: wasmPath } });
        this.REGISTERED_GRAMMARS.add(language);
    }

    private stripQuotes(value: string): string {
        return value
            .replace(/^['"`]/, "")
            .replace(/['"`]$/, "")
            .replace(/[;,)]+$/, "")
            .trim();
    }

    private getSgRootCache(language: AstGrepGrammar): SgRootCache {
        if (!this.SG_ROOT_CACHE_BY_CONTENT[language]) {
            this.SG_ROOT_CACHE_BY_CONTENT[language] = new Map<number, Map<number, SgRoot>>();
        }
        return this.SG_ROOT_CACHE_BY_CONTENT[language]!;
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
