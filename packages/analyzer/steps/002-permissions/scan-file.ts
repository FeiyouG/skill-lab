import type { AnalyzerState, FileReference, Permission, PermissionScope } from "../../types.ts";
import type { AstGrepMatch } from "../../astgrep/client.ts";
import { matchesToFindings, scanWithRules } from "../../astgrep/mod.ts";
import { RULES_BY_FILETYPE } from "../../rules/mod.ts";
import { generatePermissionId } from "../../utils/id-generator.ts";

const GENERIC_SHELL_RULE_ID = "shell-generic-command";
const SHELL_RESERVED_WORDS = new Set([
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "for",
    "while",
    "until",
    "do",
    "done",
    "case",
    "esac",
    "in",
    "function",
    "select",
    "time",
    "coproc",
    "let",
    "declare",
    "typeset",
    "local",
    "readonly",
    "export",
    "unset",
    "alias",
    "unalias",
    "source",
    "true",
    "false",
]);

/**
 * Scans a text-like file and returns updated state with permissions and findings.
 */
export function scanFileForPermissions(input: {
    state: AnalyzerState;
    fileRef: FileReference;
    scanPath: string;
    content: string;
    lineOffset?: number;
    referenceType?: "content" | "script" | "inline";
}): AnalyzerState {
    const {
        state,
        fileRef,
        scanPath,
        content,
        lineOffset = 0,
        referenceType = "content",
    } = input;
    const permissions: Permission[] = [];
    const findings = [...state.findings];
    const rulesUsed = [...state.metadata.rulesUsed];

    const rules = [...(RULES_BY_FILETYPE[fileRef.fileType] ?? [])];
    if (rules.length === 0) {
        return {
            ...state,
            metadata: {
                ...state.metadata,
                scannedFiles: [...state.metadata.scannedFiles, scanPath],
            },
        };
    }

    const scanLanguage = rules[0].language;
    const matches = scanWithRules(content, scanLanguage, rules);
    const lines = content.split("\n");
    const filteredMatches = matches.filter((match) =>
        shouldKeepMatchForBlock(match, lineOffset + 1, lines)
    );
    const blockFindings = matchesToFindings(
        scanPath,
        referenceType,
        filteredMatches.map((match) => ({
            ...match,
            line: match.line + lineOffset,
            lineEnd: (match.lineEnd ?? match.line) + lineOffset,
        })),
        fileRef.referencedBy,
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

    return {
        ...state,
        permissions: [...state.permissions, ...permissions],
        findings,
        metadata: {
            ...state.metadata,
            rulesUsed,
            scannedFiles: [...state.metadata.scannedFiles, scanPath],
        },
    };
}

function shouldKeepMatchForBlock(
    match: AstGrepMatch,
    blockStartLine: number,
    blockLines: string[],
): boolean {
    if (match.ruleId !== GENERIC_SHELL_RULE_ID) return true;

    const rawTool = match.extracted.tool;
    if (typeof rawTool !== "string") return false;

    const normalizedTool = normalizeDetectedTool(rawTool);
    if (!normalizedTool) return false;

    const lineIndex = Math.max(0, match.line - 1);
    const line = blockLines[lineIndex] ?? "";
    if (!isLikelyCommandLine(line, normalizedTool, blockStartLine + lineIndex)) {
        return false;
    }

    match.extracted.tool = normalizedTool;
    return true;
}

function normalizeDetectedTool(rawTool: string): string | null {
    const normalized = rawTool
        .trim()
        .replace(/^['"`([{]+/, "")
        .replace(/[)\]}'"`:,;]+$/, "")
        .toLowerCase();

    if (!normalized) return null;
    if (normalized.length > 32) return null;
    if (!/^[a-z][a-z0-9+._-]*$/.test(normalized)) return null;
    if (SHELL_RESERVED_WORDS.has(normalized)) return null;
    return normalized;
}

function isLikelyCommandLine(line: string, tool: string, _lineNumber: number): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("#")) return false;
    if (/^(?:[-*]|\d+[.)])\s+/.test(trimmed)) return false;
    if (/^[A-Z]/.test(trimmed)) return false;
    if (/^\w+[\w.-]*\s*=/.test(trimmed)) return false;
    if (/^(?:\{|\[|"|')/.test(trimmed)) return false;
    if (/^\w[^$]*[.!?]$/.test(trimmed) && trimmed.includes(" ")) return false;

    const escapedTool = tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const commandStart = new RegExp(`(?:^|[;&|()]\\s*)${escapedTool}(?:\\s|$)`, "i");
    return commandStart.test(trimmed);
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
