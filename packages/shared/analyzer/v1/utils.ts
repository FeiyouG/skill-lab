/**
 * Utilities: frontmatter parsing, reference tracking.
 */

/** Parse YAML frontmatter from SKILL.md */
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

/** Find line numbers matching pattern */
export function findLineReferences(
    content: string,
    pattern: RegExp,
    path: string,
): string[] {
    const lines = content.split("\n");
    const refs: string[] = [];
    lines.forEach((line, index) => {
        if (pattern.test(line)) {
            const lineNumber = index + 1;
            refs.push(`${path}:L${lineNumber}-L${lineNumber}`);
        }
    });
    return refs;
}

/** Merge line references */
export function mergeReferences(
    target: Record<string, string[]>,
    key: string,
    refs: string[],
): void {
    if (refs.length === 0) return;
    if (!target[key]) {
        target[key] = [...refs];
        return;
    }
    target[key] = Array.from(new Set([...target[key], ...refs]));
}

/** Parse allowed-tools to array */
export function normalizeAllowedTools(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .split(/[\s,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => entry.toLowerCase());
}

/** Find SKILL.md path */
// export function pickSkillMdPath(paths: string[]): string | null {
//   const direct = paths.find((path) => path.endsWith("SKILL.md"));
//   if (direct) return direct;
//   const alt = paths.find((path) => path.toLowerCase().endsWith("skill.md"));
//   return alt ?? null;
// }
