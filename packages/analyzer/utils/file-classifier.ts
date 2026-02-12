import type { FileRole, FileType, SourceType } from "../types.ts";

const FILE_TYPE_BY_EXTENSION: Record<string, FileType> = {
    md: "markdown",
    txt: "text",
    sh: "bash",
    bash: "bash",
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
};

const BINARY_EXTENSIONS = new Set(["zip", "tar", "gz", "png", "jpg", "jpeg", "gif", "pdf"]);

// Classifies files by extension with a safe unknown fallback.
export function getFileType(path: string): FileType {
    const lower = path.toLowerCase();
    if (lower.endsWith(".tar.gz")) return "binary";
    const ext = lower.split(".").pop();
    if (!ext) return "unknown";
    if (FILE_TYPE_BY_EXTENSION[ext]) return FILE_TYPE_BY_EXTENSION[ext];
    if (BINARY_EXTENSIONS.has(ext)) return "binary";
    return "unknown";
}

// Adds semantic meaning to paths for priority and reporting.
export function getFileRole(path: string): FileRole {
    const base = path.split("/").pop()?.toLowerCase() ?? "";
    const lower = path.toLowerCase();
    if (base === "skill.md") return "entrypoint";
    if (base === "reference.md" || lower.includes("/references/")) return "reference";
    if (base.startsWith("license")) return "license";
    if (base.startsWith("readme")) return "readme";
    if (lower.includes("/scripts/")) return "script";
    if (/\.(env\.example|sample\.|template|example\.)/i.test(base)) return "config";
    return "regular";
}

export function getSourceType(existsInSkill: boolean): SourceType {
    return existsInSkill ? "local" : "external";
}
