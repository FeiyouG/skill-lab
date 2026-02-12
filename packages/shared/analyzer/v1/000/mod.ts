/**
 * Step 0: Lists files and parses SKILL.md frontmatter.
 */
import type { AnalyzerContext, AnalyzerState } from "../types.ts";
import { parseFrontmatter } from "../utils.ts";

export async function runStep0(
    state: AnalyzerState,
    context: AnalyzerContext,
): Promise<AnalyzerState> {
    const files = state.files ?? (await context.skillReader.listFiles());
    const skillMdPath = await context.skillReader.getSkillMdPath();
    let frontmatter: Record<string, string> | null = null;

    if (skillMdPath) {
        const content = await context.skillReader.readTextFile(skillMdPath);
        if (content) {
            frontmatter = parseFrontmatter(content);
        }
    }

    const rawResults = {
        ...(state.rawResults ?? {}),
        inventory: {
            fileCount: files.length,
            skillMdPath,
        },
    };

    return {
        ...state,
        files,
        frontmatter,
        rawResults,
    };
}
