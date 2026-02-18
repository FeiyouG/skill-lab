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

import ProgressBar from "@deno-library/progress";
import { join } from "@std/path";
import { showProgress } from "../logging.ts";
import type { AnalyzerLogger, AnalyzerLogLevel } from "../types.ts";

const TREESITTER_GRAMMER_SUBDIR = "treesitter/grammars";

export type GrammarSpec = {
    /** Local filename used in the cache directory. */
    filename: string;
    /** Exact, version-pinned URL to download the grammar .wasm from. */
    url: string;
};

/** Progress event emitted per chunk while downloading a grammar WASM file. */
export type DownloadProgressEvent = {
    label: string;
    received: number;
    total: number;
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
 * @param opts.logLevel - Controls whether a standalone progress bar is shown (fallback when no onDownloadProgress supplied)
 * @param opts.onDownloadProgress - If provided, called per chunk instead of rendering a standalone progress bar
 * @returns Absolute path to the cached .wasm file
 */
export async function ensureGrammar(
    lang: string,
    opts?: {
        logger?: AnalyzerLogger;
        logLevel?: AnalyzerLogLevel;
        onDownloadProgress?: (event: DownloadProgressEvent) => void;
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
    opts?.logger?.info(`Grammar cache miss; downloading grammar for ${lang}`);

    const resp = await fetch(spec.url);
    if (!resp.ok) {
        throw new Error(
            `Failed to download grammar ${spec.filename}: HTTP ${resp.status} from ${spec.url}`,
        );
    }

    const contentLength = Number(resp.headers.get("content-length") ?? "0");
    const label = `Downloading treesitter grammar for ${lang}`;

    // If caller supplies an onDownloadProgress callback, delegate rendering to it
    // (e.g. step 001 wires this into a MultiProgressBar row).
    // Otherwise fall back to a standalone ProgressBar (e.g. step 002 cache miss).
    const onDownloadProgress = opts?.onDownloadProgress;
    const useStandaloneBar = !onDownloadProgress &&
        showProgress({ logLevel: opts?.logLevel }) &&
        Deno.stdout.isTerminal() &&
        contentLength > 0;

    const standaloneBar = useStandaloneBar
        ? new ProgressBar({
            title: label,
            total: contentLength,
            output: Deno.stderr,
            clear: true,
            display: ":title [:bar] :completed/:total bytes :percent",
        })
        : null;

    if (standaloneBar) {
        await standaloneBar.render(0);
    }

    let bytes: Uint8Array;
    if (!resp.body) {
        bytes = new Uint8Array(await resp.arrayBuffer());
        const total = contentLength || bytes.byteLength;
        onDownloadProgress?.({ label, received: total, total });
        if (standaloneBar) {
            await standaloneBar.render(total);
            await standaloneBar.end();
        }
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

            onDownloadProgress?.({ label, received, total: contentLength });
            if (standaloneBar) {
                await standaloneBar.render(Math.min(received, contentLength));
            }
        }

        if (standaloneBar) {
            await standaloneBar.end();
        }

        bytes = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
    }

    await Deno.writeFile(cachedPath, bytes);
    opts?.logger?.info(`Grammar download complete: ${lang} (${bytes.byteLength} bytes)`);

    return cachedPath;
}
