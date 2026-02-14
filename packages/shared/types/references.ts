import { FileType } from "./filetypes.ts";

export type ReferenceType = "frontmatter" | "content" | "script" | "inline";

export type Reference = {
    file: string;
    line: number;
    lineEnd?: number;
    type: ReferenceType;
    referencedBy?: Reference;
};

export type SourceType = "local" | "external";

export type FileRole =
    | "entrypoint"
    | "license"
    | "readme"
    | "reference"
    | "config"
    | "script"
    | "library" // unresolved imported dependency (package/module not in skill files)
    | "regular"
    | "host-fs"; // path targeting the host filesystem (not a skill-local file)

export type FileRefDiscoveryMethod =
    | "markdown-link" // [text](path) explicit markdown link
    | "inline-code" // `command path` inline code token
    | "bare-path" // bare path-like string in prose
    | "import" // import/require/from package statement
    | "url" // URL referenced by a network command (curl, wget, fetch)
    | "source" // shell source / . file.sh include
    | "code-block"; // virtual code block reference within parent file

export type FileReference = {
    /** The relative path of file to the root of the skill */
    path: string;
    sourceType: SourceType;
    fileType: FileType;
    role: FileRole;
    depth: number;
    referencedBy?: Reference;
    /** How this reference was discovered during file extraction. */
    discoveryMethod?: FileRefDiscoveryMethod;
};

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
