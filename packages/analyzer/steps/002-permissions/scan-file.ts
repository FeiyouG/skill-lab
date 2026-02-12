import type {
    AnalyzerState,
    FileReference,
    Permission,
    PermissionScope,
    ReferenceType,
} from "../../types.ts";
import { matchesToFindings, scanWithRules } from "../../astgrep/mod.ts";
import { RULES_BY_FILETYPE } from "../../rules/mod.ts";
import type { AstGrepRule } from "../../astgrep/client.ts";
import { generatePermissionId } from "../../utils/id-generator.ts";

/**
 * Scans a text-like file and returns updated state with permissions and findings.
 */
export function scanFileForPermissions(input: {
    state: AnalyzerState;
    fileRef: FileReference;
    content: string;
}): AnalyzerState {
    const { state, fileRef, content } = input;
    const permissions: Permission[] = [];
    const findings = [...state.findings];
    const rulesUsed = [...state.metadata.rulesUsed];

    const blocks = extractCodeBlocks(content, fileRef.fileType);
    for (const block of blocks) {
        const rules = [...(RULES_BY_FILETYPE[block.language] ?? [])];
        if (rules.length === 0) continue;

        const matches = scanWithRules(block.content, block.language, rules);
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

type TextBlock = {
    language: AstGrepRule["language"];
    content: string;
    startLine: number;
    type: ReferenceType;
};

const INLINE_CODE_PATTERN = /`([^`\n]+)`/g;
const KNOWN_INLINE_COMMANDS = new Set([
    "bash",
    "sh",
    "zsh",
    "git",
    "gh",
    "openspec",
    "curl",
    "wget",
    "npm",
    "pnpm",
    "yarn",
    "deno",
    "node",
    "python",
    "docker",
    "bd",
]);
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

function extractCodeBlocks(content: string, fileType: FileReference["fileType"]): TextBlock[] {
    const isTextLike = fileType === "markdown" || fileType === "text";
    const defaultLanguage = isTextLike ? "bash" : mapFileTypeToLanguage(fileType);
    const blocks: TextBlock[] = [
        {
            language: fileType === "text" ? "markdown" : mapFileTypeToLanguage(fileType),
            content,
            startLine: 1,
            type: "content",
        },
    ];

    if (!isTextLike) return blocks;

    const lines = content.split("\n");
    let inFence = false;
    let fenceLanguage = "";
    let fenceStart = 0;
    const buffer: string[] = [];

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const fence = line.match(/^\s*```+\s*([\w-]+)?\s*$/);
        if (fence && !inFence) {
            inFence = true;
            fenceLanguage = fence[1] ?? "";
            fenceStart = i + 2;
            buffer.length = 0;
            continue;
        }

        if (fence && inFence) {
            blocks.push({
                language: normalizeLanguage(fenceLanguage) ?? defaultLanguage,
                content: buffer.join("\n"),
                startLine: fenceStart,
                type: "script",
            });
            inFence = false;
            fenceLanguage = "";
            buffer.length = 0;
            continue;
        }

        if (inFence) buffer.push(line);
    }

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        for (const match of line.matchAll(INLINE_CODE_PATTERN)) {
            const snippet = (match[1] ?? "").trim();
            if (!isLikelyInlineCommand(snippet)) continue;
            blocks.push({
                language: "bash",
                content: snippet,
                startLine: i + 1,
                type: "inline",
            });
        }
    }

    return blocks;
}

function isLikelyInlineCommand(snippet: string): boolean {
    if (!snippet) return false;
    const parts = snippet.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return false;
    const command = parts[0].toLowerCase();
    if (!/^[a-z][a-z0-9._-]*$/i.test(command)) return false;
    if (parts.length > 1) return true;
    return KNOWN_INLINE_COMMANDS.has(command);
}

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

function normalizeLanguage(language: string): AstGrepRule["language"] | null {
    const lower = language.toLowerCase();
    if (!lower || lower === "markdown" || lower === "md") return "markdown";
    if (["js", "javascript", "mjs", "cjs"].includes(lower)) return "javascript";
    if (["ts", "typescript"].includes(lower)) return "typescript";
    if (["py", "python"].includes(lower)) return "python";
    if (["bash", "sh", "zsh", "shell"].includes(lower)) return "bash";
    return null;
}

function mapFileTypeToLanguage(fileType: FileReference["fileType"]): AstGrepRule["language"] {
    switch (fileType) {
        case "bash":
            return "bash";
        case "javascript":
            return "javascript";
        case "typescript":
            return "typescript";
        case "python":
            return "python";
        default:
            return "markdown";
    }
}
