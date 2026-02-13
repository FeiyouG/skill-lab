import type Parser from "tree-sitter";

type TreesitterGrammer =
    | "markdown"
    | "markdown-inline";

// export type TreesitterQuery = {
//     matches: (
//         node: unknown,
//     ) => Array<{ captures: Array<{ name: string; node: unknown }> }>;
// };

export class TreesitterClient {
    private PARSER_BY_GRAMMAR: Partial<Record<TreesitterGrammer, Parser>> = {};
    private LANG_BY_GRAMMAR: Partial<Record<TreesitterGrammer, Parser.Language>> = {};
    private QUERY_CACHE = new Map<string, Parser.Query>();
    private ROOT_NODE_CACHE_BY_GRAMMAR: Partial<
        // cache by length then hash
        Record<TreesitterGrammer, Map<number, Map<number, Parser.Tree>>>
    > = {};

    private GRAMMER_LIB_BY_LANGUAGE: Record<
        TreesitterGrammer,
        { lib: string; module?: string }
    > = {
        markdown: { lib: "@tree-sitter-grammars/tree-sitter-markdown" },
        "markdown-inline": {
            lib: "@tree-sitter-grammars/tree-sitter-markdown",
            module: "inline",
        },
    };

    public async getParser(grammar: TreesitterGrammer): Promise<Parser> {
        if (this.PARSER_BY_GRAMMAR[grammar]) {
            return this.PARSER_BY_GRAMMAR[grammar]!;
        }

        const gramerLib = this.GRAMMER_LIB_BY_LANGUAGE[grammar];
        if (!gramerLib) {
            throw new Error(`Treesiter for ${grammar} is not configured`);
        }

        const [{ default: Parser }, libModule] = await Promise.all([
            import("tree-sitter"),
            import(gramerLib.lib),
        ]);

        // The markdown npm package exposes sub-grammars via "module.exports":
        // { default: ..., "module.exports": { name, language, inline, nodeTypeInfo } }
        let grammarModule: Parser.Language = libModule.default;
        if (gramerLib.module) {
            const moduleExports = libModule["module.exports"];
            grammarModule = moduleExports?.[gramerLib.module];
        }
        if (!grammarModule) {
            throw new Error(
                `Invalid tree-sitter grammar: "${gramerLib.module}" not found in ${gramerLib.lib}`,
            );
        }

        this.LANG_BY_GRAMMAR[grammar] = grammarModule;

        const parser = new Parser();
        parser.setLanguage(
            grammarModule as Parameters<typeof parser.setLanguage>[0],
        );

        this.PARSER_BY_GRAMMAR[grammar] = parser;
        return parser;
    }

    /** 
     * Creates (and caches) a tree-sitter Query for the given grammar and S-expression query string. 
     */
    public async createQuery(
        grammar: TreesitterGrammer,
        queryString: string,
    ): Promise<Parser.Query> {
        const cacheKey = `${grammar}:${queryString}`;
        if (this.QUERY_CACHE.has(cacheKey)) {
            return this.QUERY_CACHE.get(cacheKey)!;
        }

        await this.getParser(grammar); // ensures LANG_BY_GRAMMAR[grammar] is populated
        const { default: Parser } = await import("tree-sitter");
        const lang = this.LANG_BY_GRAMMAR[grammar]!;
        const query = new Parser.Query(lang, queryString) as Parser.Query;
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
    public async parse(grammar: TreesitterGrammer, content: string): Promise<Parser.Tree> {
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

        const hash = this.hashContent(content);
        const bucket = treeCacheByLen.get(len) ?? new Map<number, Parser.Tree>();
        bucket.set(hash, tree);
        treeCacheByLen.set(len, bucket);

        return tree;
    }

    private getTreeCache(grammar: TreesitterGrammer): Map<number, Map<number, Parser.Tree>> {
        if (!this.ROOT_NODE_CACHE_BY_GRAMMAR[grammar]) {
            this.ROOT_NODE_CACHE_BY_GRAMMAR[grammar] = new Map<number, Map<number, Parser.Tree>>();
        }
        return this.ROOT_NODE_CACHE_BY_GRAMMAR[grammar]!;
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
