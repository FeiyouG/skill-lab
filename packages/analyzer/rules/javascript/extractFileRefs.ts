/**
 * File reference extractor for JavaScript and TypeScript files.
 *
 * Detects:
 * - import/export ... from "specifier" → via: "import"
 * - require("specifier") → via: "import"
 * - URL string literals used in fetch/axios/XMLHttpRequest → via: "url"
 * - Host filesystem paths in fs.readFile / fs.writeFile / open calls → via: "bare-path"
 */

import { type FileRefDiscovery, isHostFsPath, isUrl } from "../shared/file-refs.ts";

/** Matches: import ... from "specifier" or import("specifier") */
const IMPORT_FROM_PATTERN = /\bimport\s*(?:[\w{},\s*]+\bfrom\b\s*)?["'`]([^"'`\n]+)["'`]/g;

/** Matches: export ... from "specifier" */
const EXPORT_FROM_PATTERN = /\bexport\s+(?:[\w{},\s*]+\bfrom\b\s*)["'`]([^"'`\n]+)["'`]/g;

/** Matches: require("specifier") */
const REQUIRE_PATTERN = /\brequire\s*\(\s*["'`]([^"'`\n]+)["'`]\s*\)/g;

/** Matches: fetch("url"), axios.get("url"), etc. */
const URL_CALL_PATTERN =
    /\b(?:fetch|axios\.(?:get|post|put|delete|patch|head)|XMLHttpRequest|request|got|superagent)\s*[\.(]\s*["'`](https?:\/\/[^"'`\n]+)["'`]/g;

/** Matches: fs.readFile/writeFile/appendFile/open with host path */
const FS_PATH_PATTERN =
    /\bfs\.(?:readFile|writeFile|appendFile|open|access|stat|unlink|mkdir|rmdir|rename|copyFile)\s*\(\s*["'`]([^"'`\n]+)["'`]/g;

/**
 * Extracts file references from JavaScript/TypeScript source content.
 */
export function extractJsFileRefs(content: string): FileRefDiscovery[] {
    const refs: FileRefDiscovery[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNo = i + 1;

        // Skip comment lines
        if (/^\s*\/\//.test(line)) continue;

        // import ... from "specifier"
        IMPORT_FROM_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(IMPORT_FROM_PATTERN)) {
            const specifier = match[1]?.trim();
            if (specifier) refs.push({ path: specifier, line: lineNo, via: "import" });
        }

        // export ... from "specifier"
        EXPORT_FROM_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(EXPORT_FROM_PATTERN)) {
            const specifier = match[1]?.trim();
            if (specifier) refs.push({ path: specifier, line: lineNo, via: "import" });
        }

        // require("specifier")
        REQUIRE_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(REQUIRE_PATTERN)) {
            const specifier = match[1]?.trim();
            if (specifier) refs.push({ path: specifier, line: lineNo, via: "import" });
        }

        // fetch/axios URLs
        URL_CALL_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(URL_CALL_PATTERN)) {
            const url = match[1]?.trim();
            if (url && isUrl(url)) refs.push({ path: url, line: lineNo, via: "url" });
        }

        // fs calls with host paths
        FS_PATH_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(FS_PATH_PATTERN)) {
            const path = match[1]?.trim();
            if (path && isHostFsPath(path)) {
                refs.push({ path, line: lineNo, via: "bare-path" });
            }
        }
    }

    return refs;
}
