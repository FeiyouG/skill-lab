import ProgressBar from "@deno-library/progress";
import { showProgress } from "../../logging.ts";
import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import type { Permission, Reference } from "skill-lab/shared";
import { PROMPT_REGEX_RULES } from "../../rules/mod.ts";
import { RULES_BY_FILETYPE } from "../../rules/mod.ts";
import { isLikelyInlineBashCommand } from "../../rules/bash/inline-command-classifier.ts";
import { decodeCodeBlockPath } from "../../utils/code-block-path.ts";
import { generatePermissionId } from "../../utils/id-generator.ts";
import { scanFileForPermissions } from "./scan-file.ts";
import { seedPermissionsFromFrontmatter } from "./seed-frontmatter.ts";
import { synthesizePermissions } from "./synthesize.ts";

const ANSI_SHOW_CURSOR = "\x1b[?25h";
const ENCODER = new TextEncoder();

export async function run002Permissions(
    state: AnalyzerState,
    context: AnalyzerContext,
): Promise<AnalyzerState> {
    const skillMdPath = state.scanQueue.find((file) => file.role === "entrypoint")?.path ??
        "SKILL.md";
    let next = state;

    next = seedPermissionsFromFrontmatter(next, skillMdPath);

    const shouldRenderProgress = showProgress(context) && Deno.stdout.isTerminal();
    const scanBar = shouldRenderProgress
        ? new ProgressBar({
            total: Math.max(1, next.scanQueue.length),
            clear: true,
            output: Deno.stderr,
            complete: '=',
            incomplete: '-',
            display: "Scanning skills [:bar] :percent ETA :eta",
        })
        : null;
    let processed = 0;
    try {
        await scanBar?.render(processed);

        for (const fileRef of next.scanQueue) {
            try {
                if (fileRef.sourceType === "external") {
                    if (fileRef.role === "host-fs") {
                        next = addHostFsPermission(next, fileRef.path, fileRef.referencedBy);
                    } else if (fileRef.role === "library") {
                        next = {
                            ...next,
                            warnings: [
                                ...next.warnings,
                                `External library/import not analyzed yet: ${fileRef.path}`,
                            ],
                            metadata: {
                                ...next.metadata,
                                skippedFiles: [...next.metadata.skippedFiles, {
                                    path: fileRef.path,
                                    reason: "external_library_dependency",
                                    referenceBy: fileRef.referencedBy,
                                }],
                            },
                        };
                    } else if (
                        fileRef.discoveryMethod === "markdown-link" ||
                        fileRef.discoveryMethod === "url" ||
                        fileRef.discoveryMethod === undefined
                    ) {
                        next = {
                            ...next,
                            warnings: [
                                ...next.warnings,
                                `External reference not analyzed yet: ${fileRef.path}`,
                            ],
                            metadata: {
                                ...next.metadata,
                                skippedFiles: [...next.metadata.skippedFiles, {
                                    path: fileRef.path,
                                    reason: "external_reference",
                                    referenceBy: fileRef.referencedBy,
                                }],
                            },
                        };
                    }
                    continue;
                }

                const scanTargets = await resolveScanTargets(fileRef, context);
                if (scanTargets.length === 0) continue;

                if (!RULES_BY_FILETYPE[fileRef.fileType]) {
                    next = {
                        ...next,
                        warnings: [
                            ...next.warnings,
                            `File type '${fileRef.fileType}' is not supported yet for analysis: ${fileRef.path}`,
                        ],
                        metadata: {
                            ...next.metadata,
                            skippedFiles: [...next.metadata.skippedFiles, {
                                path: fileRef.path,
                                reason: `unsupported_type_${fileRef.fileType}`,
                                referenceBy: fileRef.referencedBy,
                            }],
                        },
                    };
                    continue;
                }

                for (const scanTarget of scanTargets) {
                    next = await scanFileForPermissions(context, {
                        state: next,
                        fileRef,
                        scanPath: scanTarget.scanPath,
                        content: scanTarget.content,
                        lineOffset: scanTarget.lineOffset,
                        referenceType: scanTarget.referenceType,
                    });

                    if (scanTarget.referenceType === "content") {
                        next = applyPromptRegexFindings(
                            next,
                            scanTarget.scanPath,
                            scanTarget.content,
                            scanTarget.lineOffset,
                            fileRef.referencedBy,
                        );
                    }
                }
            } finally {
                await scanBar?.render(++processed);
            }
        }
    } finally {
        await scanBar?.end();
        if (shouldRenderProgress && Deno.stderr.isTerminal()) {
            Deno.stderr.writeSync(ENCODER.encode(ANSI_SHOW_CURSOR));
        }
    }

    return synthesizePermissions(next);
}

type ScanTarget = {
    scanPath: string;
    content: string;
    lineOffset: number;
    referenceType: "content" | "script" | "inline";
};

async function resolveScanTargets(
    fileRef: AnalyzerState["scanQueue"][number],
    context: AnalyzerContext,
): Promise<ScanTarget[]> {
    if (fileRef.discoveryMethod !== "code-block") {
        const content = await context.skillReader.readTextFile(fileRef.path);
        if (!content) return [];
        return [{
            scanPath: fileRef.path,
            content,
            lineOffset: 0,
            referenceType: "content",
        }];
    }

    const decoded = decodeCodeBlockPath(fileRef.path);
    if (!decoded) return [];

    const parentContent = await context.skillReader.readTextFile(decoded.parentPath);
    if (!parentContent) return [];

    const lines = parentContent.split("\n");
    const referenceType = fileRef.referencedBy?.type === "inline" ? "inline" : "script";

    if (referenceType === "inline") {
        const line = lines[decoded.startLine - 1] ?? "";
        const snippets = extractInlineSnippets(line);
        const likelyCommandFlags = await Promise.all(
            snippets.map((snippet) =>
                isLikelyInlineBashCommand(context, { snippet, lineContext: line })
            ),
        );
        const likelyCommands = snippets.filter((_, i) => likelyCommandFlags[i]);

        return likelyCommands.map((snippet) => ({
            scanPath: decoded.parentPath,
            content: snippet,
            lineOffset: decoded.startLine - 1,
            referenceType: "inline" as const,
        }));
    }

    const sliced = lines.slice(decoded.startLine - 1, decoded.endLine).join("\n");
    if (!sliced.trim()) return [];

    return [{
        scanPath: decoded.parentPath,
        content: sliced,
        lineOffset: decoded.startLine - 1,
        referenceType,
    }];
}

function extractInlineSnippets(line: string): string[] {
    const snippets: string[] = [];
    for (const match of line.matchAll(/`([^`\n]+)`/g)) {
        const snippet = match[1]?.trim();
        if (snippet) snippets.push(snippet);
    }
    return snippets;
}

function applyPromptRegexFindings(
    state: AnalyzerState,
    filePath: string,
    content: string,
    lineOffset: number,
    referencedBy: AnalyzerState["scanQueue"][number]["referencedBy"],
): AnalyzerState {
    const findings = [...state.findings];
    const lines = content.split("\n");

    for (const rule of PROMPT_REGEX_RULES) {
        for (let i = 0; i < lines.length; i += 1) {
            if (!rule.pattern.test(lines[i])) continue;
            findings.push({
                ruleId: rule.id,
                reference: {
                    file: filePath,
                    line: i + 1 + lineOffset,
                    type: "content",
                    referencedBy,
                },
                extracted: {},
            });
        }
    }

    return { ...state, findings };
}

function addHostFsPermission(
    state: AnalyzerState,
    path: string,
    referencedBy: Reference | undefined,
): AnalyzerState {
    const reference: Reference = {
        file: referencedBy?.file ?? "SKILL.md",
        line: referencedBy?.line ?? 1,
        type: "content",
        referencedBy,
    };

    const permission: Permission = {
        id: generatePermissionId("read", [path]),
        tool: "read",
        scope: "fs",
        permission: "read",
        args: [path],
        references: [reference],
        source: "inferred",
        comment: `Host filesystem access: ${path}`,
        risks: [],
    };

    if (state.permissions.some((p) => p.id === permission.id)) return state;
    return { ...state, permissions: [...state.permissions, permission] };
}
