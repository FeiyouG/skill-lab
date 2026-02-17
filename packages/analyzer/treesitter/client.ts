import { Language, Parser, Query, Tree } from "web-tree-sitter";
import { ensureGrammar } from "../treesitter/registry.ts";
import type { TreesitterGrammar } from "../treesitter/registry.ts";

export class TreesitterClient {
    private PARSER_BY_GRAMMAR: Partial<Record<TreesitterGrammar, Parser>> = {};
    private LANG_BY_GRAMMAR: Partial<Record<TreesitterGrammar, Language>> = {};
    private QUERY_CACHE = new Map<string, Query>();
    private ROOT_NODE_CACHE_BY_CONTENT: Partial<
        // cache by length then hash
        Record<TreesitterGrammar, Map<number, Map<number, Tree>>>
    > = {};
    /** Parser.init() is idempotent but we avoid re-calling it. */
    private parserInitialized: boolean = false;

    private async ensureParserInit() {
        if (this.parserInitialized) return;

        await Parser.init();
        this.parserInitialized = true;
    }

    public async getParser(grammar: TreesitterGrammar): Promise<Parser> {
        if (this.PARSER_BY_GRAMMAR[grammar]) {
            return this.PARSER_BY_GRAMMAR[grammar]!;
        }

        await this.ensureParserInit();

        let lang = this.LANG_BY_GRAMMAR[grammar];
        if (!lang) {
            const wasmPath = await ensureGrammar(grammar);
            lang = await Language.load(wasmPath);
            this.LANG_BY_GRAMMAR[grammar] = lang;
        }

        const parser = new Parser();
        parser.setLanguage(lang);

        this.PARSER_BY_GRAMMAR[grammar] = parser;
        return parser;
    }

    /**
     * Creates (and caches) a tree-sitter Query for the given grammar and S-expression query string.
     */
    public async createQuery(grammar: TreesitterGrammar, queryString: string): Promise<Query> {
        const cacheKey = `${grammar}:${queryString}`;
        if (this.QUERY_CACHE.has(cacheKey)) {
            return this.QUERY_CACHE.get(cacheKey)!;
        }

        await this.getParser(grammar); // ensures LANG_BY_GRAMMAR[grammar] is populated
        const lang = this.LANG_BY_GRAMMAR[grammar]!;
        const query = new Query(lang, queryString);
        this.QUERY_CACHE.set(cacheKey, query);
        return query;
    }

    /**
     * Parses content into a tree-sitter Tree with memoization.
     *
     * Cache key strategy:
     * - first level: content length
     * - second level: fast non-cryptographic hash of content
     */
    public async parse(grammar: TreesitterGrammar, content: string): Promise<Tree> {
        const treeCacheByLen = this.getTreeCache(grammar);
        const len = content.length;
        const treeCacheByHash = treeCacheByLen.get(len);
        if (treeCacheByHash) {
            const hash = this.hashContent(content);
            const cached = treeCacheByHash.get(hash);
            if (cached) return cached;
        }

        const parser = await this.getParser(grammar);
        const tree = parser.parse(content);
        if (!tree) {
            throw new Error(`Failed to parse ${grammar} content`);
        }

        const hash = this.hashContent(content);
        const bucket = treeCacheByLen.get(len) ?? new Map<number, Tree>();
        bucket.set(hash, tree);
        treeCacheByLen.set(len, bucket);

        return tree;
    }

    private getTreeCache(grammar: TreesitterGrammar): Map<number, Map<number, Tree>> {
        if (!this.ROOT_NODE_CACHE_BY_CONTENT[grammar]) {
            this.ROOT_NODE_CACHE_BY_CONTENT[grammar] = new Map<
                number,
                Map<number, Tree>
            >();
        }
        return this.ROOT_NODE_CACHE_BY_CONTENT[grammar]!;
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
