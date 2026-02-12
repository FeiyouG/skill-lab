import { parse as parseYaml } from "@std/yaml";
import {
    DEFAULT_SKILL_VERSION,
    FRONTMATTER_SUPPORTED_FIELDS,
    UNSUPPORTED_SKILL_FRONTMATTER_FIELDS,
} from "../../config.ts";
import type { AnalyzerState, Frontmatter } from "../../types.ts";

export function parseFrontmatterIntoState(state: AnalyzerState, skillMdContent: string): void {
    const block = extractFrontmatterBlock(skillMdContent);
    if (!block) {
        state.warnings.push("SKILL.md is missing YAML frontmatter");
        state.frontmatter = {};
        if (!state.skillVersionId) state.skillVersionId = DEFAULT_SKILL_VERSION;
        return;
    }

    let frontmatter: Frontmatter;
    try {
        frontmatter = (parseYaml(block) as Frontmatter) ?? {};
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        state.warnings.push(`Failed to parse frontmatter YAML: ${message}`);
        frontmatter = {};
    }

    state.frontmatter = frontmatter;
    state.skillId = String(frontmatter.name ?? state.skillId ?? "unknown");

    const version = (frontmatter.metadata as Record<string, unknown> | undefined)?.version;
    state.skillVersionId = String(version ?? state.skillVersionId ?? DEFAULT_SKILL_VERSION);

    for (const field of UNSUPPORTED_SKILL_FRONTMATTER_FIELDS) {
        if (frontmatter[field] !== undefined) {
            state.warnings.push(`Analysis not available for field '${field}' yet`);
        }
    }

    for (const field of Object.keys(frontmatter)) {
        if (
            !FRONTMATTER_SUPPORTED_FIELDS.includes(
                field as (typeof FRONTMATTER_SUPPORTED_FIELDS)[number],
            ) &&
            !UNSUPPORTED_SKILL_FRONTMATTER_FIELDS.includes(
                field as (typeof UNSUPPORTED_SKILL_FRONTMATTER_FIELDS)[number],
            )
        ) {
            state.warnings.push(`Unknown frontmatter field '${field}' ignored`);
        }
    }
}

export function findFrontmatterLine(content: string, key: string): number {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].trimStart().startsWith(`${key}:`)) return i + 1;
    }
    return 1;
}

function extractFrontmatterBlock(content: string): string | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    return match ? match[1] : null;
}
