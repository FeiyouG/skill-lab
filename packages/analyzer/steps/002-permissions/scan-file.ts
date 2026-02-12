import type { AnalyzerState, FileReference, Permission, PermissionScope } from "../../types.ts";
import { matchesToFindings, scanWithRules } from "../../astgrep/mod.ts";
import { FILETYPE_CONFIGS, RULES_BY_FILETYPE } from "../../rules/mod.ts";
import { generatePermissionId } from "../../utils/id-generator.ts";

/**
 * Scans a text-like file and returns updated state with permissions and findings.
 */
export async function scanFileForPermissions(input: {
    state: AnalyzerState;
    fileRef: FileReference;
    content: string;
}): Promise<AnalyzerState> {
    const { state, fileRef, content } = input;
    const permissions: Permission[] = [];
    const findings = [...state.findings];
    const rulesUsed = [...state.metadata.rulesUsed];

    const config = FILETYPE_CONFIGS[fileRef.fileType];
    const defaultLanguage = config?.defaultLanguage ?? null;
    if (!defaultLanguage) {
        return {
            ...state,
            metadata: {
                ...state.metadata,
                skippedFiles: [
                    ...state.metadata.skippedFiles,
                    { path: fileRef.path, reason: "unsupported_filetype" },
                ],
            },
        };
    }

    const blocks = config?.extractCodeBlocks
        ? await config.extractCodeBlocks(content, fileRef.fileType)
        : [{
            language: defaultLanguage,
            content,
            startLine: 1,
            type: "content" as const,
        }];

    for (const block of blocks) {
        const rules = [...(RULES_BY_FILETYPE[block.language as FileReference["fileType"]] ?? [])];
        if (rules.length === 0) continue;

        const scanLanguage = rules[0].language;
        const matches = scanWithRules(block.content, scanLanguage, rules);
        const blockFindings = matchesToFindings(
            fileRef.path,
            block.type,
            matches.map((match) => ({
                ...match,
                line: match.line + block.startLine - 1,
                lineEnd: (match.lineEnd ?? match.line) + block.startLine - 1,
            })),
            fileRef.invokedBy,
        );

        findings.push(...blockFindings);

        for (const finding of blockFindings) {
            const rule = rules.find((item) => item.id === finding.ruleId);
            if (!rule) continue;
            if (!rulesUsed.includes(rule.id)) rulesUsed.push(rule.id);

            const metadata = { ...finding.extracted };
            const detectedTool =
                rule.permission.tool === "detected" && typeof finding.extracted.tool === "string"
                    ? String(finding.extracted.tool).toLowerCase()
                    : rule.permission.tool;

            const args = buildPermissionArgs(metadata, detectedTool);

            permissions.push({
                id: generatePermissionId(detectedTool, args.length ? args : ["*"], metadata),
                tool: detectedTool,
                scope: rule.permission.scope as PermissionScope,
                permission: rule.permission.permission,
                args: args.length ? args : ["*"],
                fileRole: fileRef.role,
                metadata,
                references: [finding.reference],
                source: "detected",
                risks: [],
            });
        }
    }

    return {
        ...state,
        permissions: [...state.permissions, ...permissions],
        findings,
        metadata: {
            ...state.metadata,
            rulesUsed,
            scannedFiles: [...state.metadata.scannedFiles, fileRef.path],
        },
    };
}

const ARGUMENT_METADATA_KEYS = [
    "subcommand",
    "command",
    "url",
    "path",
    "file",
    "key",
    "value",
    "method",
    "host",
    "data",
    "header",
    "token",
    "tool",
];

function buildPermissionArgs(metadata: Record<string, unknown>, detectedTool: string): string[] {
    const args: string[] = [];

    for (const key of ARGUMENT_METADATA_KEYS) {
        const value = metadata[key];
        if (typeof value !== "string") continue;
        const normalized = value.trim();
        if (!normalized || normalized.startsWith("$")) continue;
        if (key === "tool" && normalized.toLowerCase() === detectedTool) continue;
        if (!args.includes(normalized)) args.push(normalized);
        if (args.length >= 4) break;
    }

    if (args.length === 0 && typeof metadata.pattern === "string") {
        const tokens = metadata.pattern.trim().split(/\s+/).filter(Boolean);
        if (tokens.length >= 2 && !tokens[1].startsWith("$")) {
            args.push(tokens[1]);
        }
    }

    return args;
}
