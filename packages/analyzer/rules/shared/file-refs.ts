/**
 * Shared types and utilities for file reference discovery across all language extractors.
 */

import { getFileType } from "skill-lab/shared";

/**
 * Patterns that indicate the referenced path targets the host filesystem
 * rather than the skill package itself.
 */
export const HOST_FS_PATTERNS: RegExp[] = [
    /^~\//, // ~/... (HOME directory expansion)
    /^\$[A-Z_][A-Z0-9_]*\//, // $HOME/..., $VAR/... (env var expansion)
    /^\//, // /absolute/path (absolute path)
];

/** Returns true if the path targets the host filesystem. */
export function isHostFsPath(path: string): boolean {
    return HOST_FS_PATTERNS.some((p) => p.test(path));
}

/** Returns true if the string looks like a URL. */
export function isUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

/**
 * Regex pattern for bare relative paths (e.g. references/guide.md, ./script.py).
 * Used by markdown and text extractors for prose scanning.
 */
export const BARE_PATH_PATTERN = /(?:\.\.?\/)?[\w./-]+\.[\w-]+/g;

/** Returns true if the value looks like a file path (not a command or word). */
export function looksLikePath(value: string): boolean {
    if (/^\.?\.?\//.test(value)) return true;
    if (value.includes("/")) return true;
    return getFileType(value) != "unknown";
}
