import { ALLOWED_TOOLS_MAPPING } from "../../config.ts";
import type { AnalyzerState, Permission, Reference } from "../../types.ts";
import { generatePermissionId } from "../../utils/id-generator.ts";

type ParsedAllowedTool = {
    name: string;
    args: string[];
};

export function seedPermissionsFromFrontmatter(
    state: AnalyzerState,
    skillMdPath: string,
): AnalyzerState {
    const rawAllowed = state.frontmatter["allowed-tools"];
    if (typeof rawAllowed !== "string" || !rawAllowed.trim()) {
        return state;
    }

    const parsed = parseAllowedTools(rawAllowed);
    const baseRef: Reference = {
        file: skillMdPath,
        line: 1,
        lineEnd: state.frontmatter.endLineNumer,
        type: "frontmatter",
    };

    const permissions: Permission[] = parsed.map((tool) => {
        const mapping = ALLOWED_TOOLS_MAPPING[tool.name] ?? {
            tool: tool.name.toLowerCase(),
            scope: "sys",
            permission: "shell",
        };
        const args = tool.args.length ? tool.args : ["*"];
        return {
            id: generatePermissionId(mapping.tool, args),
            tool: mapping.tool,
            scope: mapping.scope,
            permission: mapping.permission,
            args,
            references: [baseRef],
            source: "frontmatter",
            risks: [],
        };
    });

    return {
        ...state,
        permissions: [...state.permissions, ...permissions],
    };
}

function parseAllowedTools(value: string): ParsedAllowedTool[] {
    return value
        .trim()
        .split(/\s+/)
        .map((token) => {
            const match = token.match(/^(\w+)(?:\(([^)]+)\))?$/);
            if (!match) return null;
            const name = match[1];
            const args = match[2] ? match[2].split(/[:\s,]+/).filter(Boolean) : ["*"];
            return { name, args };
        })
        .filter((item): item is ParsedAllowedTool => item !== null);
}
