/**
 * File reference extractor for Bash/shell scripts.
 *
 * Detects:
 * - External URLs referenced via curl/wget → via: "url"
 * - Local file includes via source/. → via: "source"
 * - Host filesystem paths in command arguments → via: "bare-path"
 */

import { type FileRefDiscovery, isHostFsPath, isUrl, looksLikePath } from "../shared/file-refs.ts";

/** Matches: curl [flags] URL or wget [flags] URL */
const CURL_WGET_PATTERN =
    /\b(?:curl|wget)\s+(?:[^\s]+\s+)*?(https?:\/\/[^\s;|&>"']+|ftp:\/\/[^\s;|&>"']+)/g;

/** Matches: source ./file or . ./file (shell include) */
const SOURCE_PATTERN = /(?:^|[\s;|&(])(?:source|\.)\s+([^\s;|&>"']+)/g;

/** Matches arguments that look like paths (after common commands) */
const PATH_ARG_PATTERN =
    /(?:^|[|;&\s])(?:cat|cp|mv|ln|touch|mkdir|rm|chmod|chown|open|exec|read)\s+(-\w+\s+)*([^\s;|&>"']+)/g;

/**
 * Extracts file references from bash/shell script content.
 */
export function extractBashFileRefs(content: string): FileRefDiscovery[] {
    const refs: FileRefDiscovery[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNo = i + 1;

        // Skip comment lines
        if (/^\s*#/.test(line)) continue;

        // curl/wget URLs
        CURL_WGET_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(CURL_WGET_PATTERN)) {
            const url = match[1]?.trim();
            if (url && isUrl(url)) {
                refs.push({ path: url, line: lineNo, via: "url" });
            }
        }

        // Command token may itself be a script path (e.g. scripts/package_skill.py ...)
        const firstToken = line.trim().split(/\s+/)[0]?.replace(/["']/g, "");
        if (firstToken && looksLikePath(firstToken) && !isUrl(firstToken)) {
            refs.push({ path: firstToken, line: lineNo, via: "bare-path" });
        }

        // source / . includes
        SOURCE_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(SOURCE_PATTERN)) {
            const path = match[1]?.trim();
            if (path && looksLikePath(path)) {
                refs.push({ path, line: lineNo, via: "source" });
            }
        }

        // Host FS paths in file operation commands
        PATH_ARG_PATTERN.lastIndex = 0;
        for (const match of line.matchAll(PATH_ARG_PATTERN)) {
            const path = match[2]?.trim();
            if (path && isHostFsPath(path)) {
                refs.push({ path, line: lineNo, via: "bare-path" });
            }
        }

        // Also scan all tokens on a line for host FS paths not caught above
        for (const token of line.split(/\s+/)) {
            const cleaned = token.replace(/["']/g, "");
            if (
                isHostFsPath(cleaned) && !refs.some((r) => r.path === cleaned && r.line === lineNo)
            ) {
                refs.push({ path: cleaned, line: lineNo, via: "bare-path" });
            }
        }
    }

    return refs;
}
