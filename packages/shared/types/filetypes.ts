import { ReferenceType } from "./references.ts";
import { SkillFrontmatter } from "@FeiyouG/skill-lab-reader";

export type Frontmatter = Partial<SkillFrontmatter>;

export type FileType =
    | "markdown"
    | "text"
    | "bash"
    | "javascript"
    | "typescript"
    | "python"
    | "json"
    | "yaml"
    | "toml"
    | "config"
    | "sql"
    | "csv"
    | "xml"
    | "binary"
    | "unknown";

export type CodeBlock = {
    language: FileType;
    content: string;
    startLine: number;
    endLine: number;
    type: ReferenceType;
};

export const FILETYPE_BY_LANGUAGE: Record<string, FileType> = {
    bash: "bash",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    js: "javascript",
    javascript: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    typescript: "typescript",
    py: "python",
    python: "python",
    md: "markdown",
    markdown: "markdown",
    text: "text",

    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sql: "sql",
    csv: "csv",
    xml: "xml",
};

export const FILE_TYPE_BY_EXTENSION: Record<string, FileType> = {
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
    toml: "toml",
    ini: "config",
    sql: "sql",
    csv: "csv",
    xml: "xml",
};

export const BINARY_EXTENSIONS = new Set(["zip", "tar", "gz", "png", "jpg", "jpeg", "gif", "pdf"]);

// Classifies files by extension with a safe unknown fallback.
export function getFileType(path: string): FileType {
    const lower = path.toLowerCase();

    const ext = lower.split(".").pop();
    if (!ext) return "unknown";

    if (FILE_TYPE_BY_EXTENSION[ext]) return FILE_TYPE_BY_EXTENSION[ext];
    if (BINARY_EXTENSIONS.has(ext)) return "binary";

    return "unknown";
}

export function isFile(path: string): boolean {
    const ft = getFileType(path);
    return ft !== "unknown" && ft != "binary";
}
