import type { SkillContentType } from "./types.ts";

const TEXT_EXTENSIONS = new Set([
    ".md",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".ts",
    ".js",
    ".tsx",
    ".jsx",
    ".py",
    ".rb",
    ".sh",
    ".ps1",
    ".toml",
    ".ini",
    ".env",
    ".sql",
]);

export function contentTypeFromPath(path: string): SkillContentType {
    const lower = path.toLowerCase();
    const extIndex = lower.lastIndexOf(".");
    if (extIndex === -1) return "unknown";
    const ext = lower.slice(extIndex);
    return TEXT_EXTENSIONS.has(ext) ? "text" : "binary";
}

export function isProbablyText(bytes: Uint8Array): boolean {
    const sample = bytes.subarray(0, Math.min(bytes.length, 2048));
    let controlCount = 0;
    for (const byte of sample) {
        if (byte === 0) return false;
        if (byte < 9 || (byte > 13 && byte < 32)) controlCount += 1;
    }
    return controlCount / Math.max(sample.length, 1) < 0.1;
}

export function parseFrontmatter(content: string): Record<string, string> | null {
    const trimmed = content.trimStart();
    if (!trimmed.startsWith("---")) return null;
    const lines = trimmed.split("\n");
    let endIndex = -1;
    for (let i = 1; i < lines.length; i += 1) {
        if (lines[i].trim() === "---") {
            endIndex = i;
            break;
        }
    }
    if (endIndex === -1) return null;
    const frontmatterLines = lines.slice(1, endIndex);
    const frontmatter: Record<string, string> = {};
    for (const line of frontmatterLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) continue;
        const splitIndex = trimmedLine.indexOf(":");
        if (splitIndex === -1) continue;
        const key = trimmedLine.slice(0, splitIndex).trim();
        const value = trimmedLine.slice(splitIndex + 1).trim();
        if (key) frontmatter[key] = value;
    }
    return frontmatter;
}

// /**
//  * Skill repos are valid only when SKILL.md exists at the root.
//  */
// export function pickSkillMdPath(files: SkillFile[]): string | null {
//   const rootPath = files.find((file) => file.path.toLowerCase() === "skill.md");
//   return rootPath?.path ?? null;
// }
//
// /**
//  * Returns full SKILL.md content, or throws when the repository is not a valid skill.
//  */
// export async function getSkillContent(
//   reader: Pick<SkillReader, "listFiles" | "readTextFile">,
// ): Promise<string> {
//   const files = await reader.listFiles();
//   const skillMdPath = pickSkillMdPath(files);
//   if (!skillMdPath) {
//     throw new Error("Invalid skill repository: SKILL.md must exist at root");
//   }
//   const content = await reader.readTextFile(skillMdPath);
//   if (!content) {
//     throw new Error("Invalid skill repository: SKILL.md is unreadable");
//   }
//   return content;
// }
//
// /**
//  * Parses SKILL.md frontmatter and guarantees required fields.
//  */
// export async function getSkillFrontmatter(
//   reader: Pick<SkillReader, "listFiles" | "readTextFile">,
// ): Promise<SkillFrontmatter> {
//   const content = await getSkillContent(reader);
//   const match = content.match(/^---\n([\s\S]*?)\n---/);
//   if (!match) {
//     throw new Error("Invalid skill repository: SKILL.md missing YAML frontmatter");
//   }
//   let parsed: SkillFrontmatter;
//   try {
//     parsed = (parseYaml(match[1]) as SkillFrontmatter) ?? ({} as SkillFrontmatter);
//   } catch (error) {
//     const message = error instanceof Error ? error.message : String(error);
//     throw new Error(`Invalid skill repository: YAML frontmatter parse failed: ${message}`);
//   }
//   if (!parsed.name || !parsed.description) {
//     throw new Error("Invalid skill repository: frontmatter requires name and description");
//   }
//   return parsed;
// }
//
// export async function validateSkillReader(
//   reader: SkillReader,
// ): Promise<{ ok: boolean; reason?: string }> {
//   try {
//     await getSkillFrontmatter(reader);
//     return { ok: true };
//   } catch (error) {
//     const message = error instanceof Error ? error.message : String(error);
//     return { ok: false, reason: message };
//   }
// }
