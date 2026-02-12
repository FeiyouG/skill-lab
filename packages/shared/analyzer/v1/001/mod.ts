/**
 * Step 1: Detects permissions from allowed-tools and content patterns.
 */
import type {
    AnalysisPermissions,
    AnalyzerContext,
    AnalyzerState,
    PermissionValue,
} from "../types.ts";
import { PERMISSION_DETECTORS } from "../rules.ts";
import { contentTypeFromPath } from "@FeiyouG/skill-lab";
import { findLineReferences, mergeReferences, normalizeAllowedTools } from "../utils.ts";

export async function runStep1(
    state: AnalyzerState,
    context: AnalyzerContext,
): Promise<AnalyzerState> {
    const files = state.files ?? [];
    const permissions = new Set<PermissionValue>();
    const references: Record<string, string[]> = {};

    const allowedTools = normalizeAllowedTools(state.frontmatter?.["allowed-tools"]);
    for (const tool of allowedTools) {
        const mapped = PERMISSION_DETECTORS.allowToolsToPermissions.get(tool);
        if (mapped) {
            mapped.forEach((perm) => permissions.add(perm));
        }
    }

    if (state.frontmatter?.hooks) {
        permissions.add("hooks:run");
    }

    for (const file of files) {
        const contentType = file.contentType ?? contentTypeFromPath(file.path);
        if (contentType !== "text") continue;
        const content = await context.skillReader.readTextFile(file.path);
        if (!content) continue;
        for (const [pattern, perms] of PERMISSION_DETECTORS.contentPatterns.entries()) {
            const refs = findLineReferences(content, pattern, file.path);
            if (refs.length > 0) {
                perms.forEach((perm) => permissions.add(perm));
                perms.forEach((perm) => mergeReferences(references, perm, refs));
            }
        }
    }

    const permissionsResult: AnalysisPermissions = {
        list: Array.from(permissions),
        references: Object.keys(references).length ? references : undefined,
    };

    return {
        ...state,
        permissions: permissionsResult,
    };
}
