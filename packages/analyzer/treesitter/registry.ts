/**
 * Shared grammar registry for web-tree-sitter WASM grammars.
 *
 * Used by both AstGrepClient and TreesitterClient. Grammar .wasm files are
 * downloaded from GitHub Releases on first use and cached locally following
 * the XDG cache directory convention.
 *
 * Cache location (in priority order):
 *   1. $SKILL_LAB_CACHE_DIR
 *   2. $XDG_CACHE_HOME/skill-lab
 *   3. ~/.cache/skill-lab  (Linux/macOS)
 *      %LOCALAPPDATA%\skill-lab\Cache  (Windows)
 */

import { join } from "@std/path";
import type { AnalyzerLogger } from "../types.ts";
import ProgressBar from "@deno-library/progress";

const TREESITTER_GRAMMER_SUBDIR = "treesitter/grammars";
const ANSI_CLEAR_LINE = "\r\x1b[K";
const ENCODER = new TextEncoder();

export type GrammarSpec = {
    /** Local filename used in the cache directory. */
    filename: string;
    /** Exact, version-pinned URL to download the grammar .wasm from. */
    url: string;
};

/**
 * Grammar specifications. All URLs are exact version-pinned to ensure
 * ABI compatibility with web-tree-sitter@0.25.4.
 *
 * Grammar .wasm files are compiled by the tree-sitter CLI against a specific
 * WASM ABI. Mixing grammar versions with a different web-tree-sitter version
 * causes silent parse failures, so both must be pinned together.
 */
export const GRAMMAR_SPECS = {
    bash: {
        filename: "bash.wasm",
        url: "https://github.com/tree-sitter/tree-sitter-bash/releases/download/v0.25.1/tree-sitter-bash.wasm",
    },
    javascript: {
        filename: "javascript.wasm",
        url: "https://github.com/tree-sitter/tree-sitter-javascript/releases/download/v0.25.0/tree-sitter-javascript.wasm",
    },
    python: {
        filename: "python.wasm",
        url: "https://github.com/tree-sitter/tree-sitter-python/releases/download/v0.25.0/tree-sitter-python.wasm",
    },
    typescript: {
        filename: "typescript.wasm",
        url: "https://github.com/tree-sitter/tree-sitter-typescript/releases/download/v0.23.2/tree-sitter-typescript.wasm",
    },
    tsx: {
        filename: "tsx.wasm",
        url: "https://github.com/tree-sitter/tree-sitter-typescript/releases/download/v0.23.2/tree-sitter-tsx.wasm",
    },
    markdown: {
        filename: "markdown.wasm",
        url: "https://github.com/tree-sitter-grammars/tree-sitter-markdown/releases/download/v0.5.2/tree-sitter-markdown.wasm",
    },
    "markdown-inline": {
        filename: "markdown_inline.wasm",
        url: "https://github.com/tree-sitter-grammars/tree-sitter-markdown/releases/download/v0.5.2/tree-sitter-markdown_inline.wasm",
    },
} satisfies Record<string, GrammarSpec>;

/** Available languages for tree-sitter grammars. */
export type TreesitterGrammar = keyof typeof GRAMMAR_SPECS;

/**
 * Returns the skill-lab cache directory, following XDG conventions.
 *
 * Priority:
 *   1. $SKILL_LAB_CACHE_DIR — explicit override
 *   2. $XDG_CACHE_HOME/skill-lab — if XDG_CACHE_HOME is set
 *   3. Platform default:
 *        Linux/macOS: ~/.cache/skill-lab
 *        Windows:     %LOCALAPPDATA%\skill-lab\Cache
 */
export function getCacheDir(): string {
    const explicit = Deno.env.get("SKILL_LAB_CACHE_DIR");
    if (explicit) return explicit;

    const xdgCache = Deno.env.get("XDG_CACHE_HOME");
    if (xdgCache) return join(xdgCache, "skill-lab");

    if (Deno.build.os === "windows") {
        const localAppData = Deno.env.get("LOCALAPPDATA");
        if (localAppData) return join(localAppData, "skill-lab", "Cache");
        const userProfile = Deno.env.get("USERPROFILE") ?? "~";
        return join(userProfile, "AppData", "Local", "skill-lab", "Cache");
    }

    const home = Deno.env.get("HOME") ?? "~";
    return join(home, ".cache", "skill-lab");
}

/**
 * Ensures a grammar .wasm file is present in the local cache.
 *
 * On first call for a given language, downloads the file from the pinned URL
 * in GRAMMAR_SPECS. Subsequent calls return immediately from cache.
 *
 * @param lang - Language key (e.g. "bash", "typescript", "markdown-inline")
 * @param opts.logger - Optional logger for download events
 * @returns Absolute path to the cached .wasm file
 */
export async function ensureGrammar(
    lang: string,
    opts?: {
        logger?: AnalyzerLogger;
        showProgressBar?: boolean;
    },
): Promise<string> {
    if (!(lang in GRAMMAR_SPECS)) {
        throw new Error(
            `No grammar spec for language: "${lang}". Available: ${
                Object.keys(GRAMMAR_SPECS).join(", ")
            }`,
        );
    }
    const spec = GRAMMAR_SPECS[lang as TreesitterGrammar];

    const cacheDir = join(getCacheDir(), TREESITTER_GRAMMER_SUBDIR);
    const cachedPath = join(cacheDir, spec.filename);

    // Return immediately if already cached
    try {
        const stat = await Deno.stat(cachedPath);
        if (stat.isFile) return cachedPath;
    } catch {
        // Not cached yet — fall through to download
    }

    // Download and write to cache
    await Deno.mkdir(cacheDir, { recursive: true });
    if (Deno.stderr.isTerminal()) {
        Deno.stderr.writeSync(ENCODER.encode(ANSI_CLEAR_LINE));
    }

    const resp = await fetch(spec.url);
    if (!resp.ok) {
        throw new Error(
            `Failed to download grammar ${spec.filename}: HTTP ${resp.status} from ${spec.url}`,
        );
    }

    const shouldRenderProgress = (opts?.showProgressBar ?? false) && Deno.stdout.isTerminal();
    const contentLenHeader = resp.headers.get("content-length")!;
    const contentLen = parseInt(contentLenHeader);
    const scanBar = shouldRenderProgress
        ? new ProgressBar({
            total: contentLen,
            clear: true,
            output: Deno.stderr,
            complete: "=",
            incomplete: "-",
            display: `Installing ${lang} grammar [:bar] :percent ETA :eta`,
        })
        : null;

    let bytes: Uint8Array;
    try {
        if (!resp.body) {
            bytes = new Uint8Array(await resp.arrayBuffer());
        } else {
            const reader = resp.body.getReader();
            const chunks: Uint8Array[] = [];
            let received = 0;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (!value) continue;

                chunks.push(value);
                received += value.byteLength;
                scanBar?.render(received);
            }

            bytes = new Uint8Array(received);
            let offset = 0;
            for (const chunk of chunks) {
                bytes.set(chunk, offset);
                offset += chunk.byteLength;
            }
        }
    } finally {
        scanBar?.end();
    }
    await Deno.writeFile(cachedPath, bytes);

    return cachedPath;
}
