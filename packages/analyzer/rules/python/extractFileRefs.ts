/**
 * File reference extractor for Python scripts.
 *
 * Detects:
 * - import / from...import statements → via: "import"
 * - open() calls with host FS paths → via: "bare-path"
 * - Host filesystem paths in string literals → via: "bare-path"
 */

import { type FileRefDiscovery, isHostFsPath, isUrl } from "../shared/file-refs.ts";

/** Matches: import foo, import foo.bar */
const IMPORT_PATTERN = /^\s*import\s+([\w.]+)/;

/** Matches: from foo import bar, from foo.bar import baz */
const FROM_IMPORT_PATTERN = /^\s*from\s+([\w.]+)\s+import/;

/** Matches: open("path") or open('path') */
const OPEN_PATTERN = /\bopen\s*\(\s*["'`]([^"'`\n]+)["'`]/g;

/** Matches URL string literals (requests.get, urllib, etc.) */
const URL_STRING_PATTERN = /["'](https?:\/\/[^"'\n]+)["']/g;

/**
 * Extracts file references from Python source content.
 */
export function extractPythonFileRefs(content: string): FileRefDiscovery[] {
    const refs: FileRefDiscovery[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNo = i + 1;

        // Skip comment lines
        if (/^\s*#/.test(line)) continue;

        // import statements
        const importMatch = IMPORT_PATTERN.exec(line);
        if (importMatch) {
            const pkg = importMatch[1]?.trim();
            if (pkg) refs.push({ path: pkg, line: lineNo, via: "import" });
        }

        // from...import statements
        const fromMatch = FROM_IMPORT_PATTERN.exec(line);
        if (fromMatch) {
            const pkg = fromMatch[1]?.trim();
            if (pkg) refs.push({ path: pkg, line: lineNo, via: "import" });
        }

        // open() with host FS path
        OPEN_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(OPEN_PATTERN)) {
            const path = match[1]?.trim();
            if (path && isHostFsPath(path)) {
                refs.push({ path, line: lineNo, via: "bare-path" });
            }
        }

        // URL string literals
        URL_STRING_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(URL_STRING_PATTERN)) {
            const url = match[1]?.trim();
            if (url && isUrl(url)) {
                refs.push({ path: url, line: lineNo, via: "url" });
            }
        }
    }

    return refs;
}
