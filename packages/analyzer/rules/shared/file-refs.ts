/**
 * Shared types and utilities for file reference discovery across all language extractors.
 */

/** How a file reference was discovered in source content. */
export type FileRefVia =
    | "markdown-link" // [text](path) explicit markdown link
    | "inline-code" // `command path` inline code token
    | "bare-path" // bare path-like string in prose
    | "import" // import/require/from package statement
    | "url" // URL referenced by a network command (curl, wget, fetch)
    | "source" // shell source / . file.sh include
    | "code-block"; // virtual code block reference within parent file

/** A file path or package reference discovered in source content. */
export type FileRefDiscovery = {
    path: string;
    line: number;
    via: FileRefVia;
};

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

/**
 * File extensions considered as skill-local supporting files.
 * Used to determine if a bare token looks like a file reference.
 */
export const KNOWN_SKILL_EXTENSIONS = new Set([
    "md",
    "txt",
    "json",
    "yaml",
    "yml",
    "ts",
    "js",
    "py",
    "sh",
    "bash",
    "toml",
    "ini",
    "sql",
    "csv",
    "xml",
]);

/** Returns true if the value looks like a file path (not a command or word). */
export function looksLikePath(value: string): boolean {
    if (/^\.?\.?\//.test(value)) return true;
    if (value.includes("/")) return true;
    const ext = value.split(".").pop()?.toLowerCase();
    if (!ext) return false;
    return KNOWN_SKILL_EXTENSIONS.has(ext) && /[a-zA-Z]/.test(value);
}
