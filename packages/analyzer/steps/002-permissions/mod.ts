import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import { PROMPT_REGEX_RULES } from "../../rules/mod.ts";
import { RULES_BY_FILETYPE } from "../../rules/mod.ts";
import { seedPermissionsFromFrontmatter } from "./seed-frontmatter.ts";
import { synthesizePermissions } from "./synthesize.ts";
import { scanFileForPermissions } from "./scan-file.ts";

export async function run002Permissions(
    state: AnalyzerState,
    context: AnalyzerContext,
): Promise<AnalyzerState> {
    const skillMdPath = state.scanQueue.find((file) => file.role === "entrypoint")?.path ??
        "SKILL.md";
    let next = state;

    next = seedPermissionsFromFrontmatter(next, skillMdPath);

    for (const fileRef of next.scanQueue) {
        if (fileRef.sourceType === "external") {
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
                    }],
                },
            };
            continue;
        }

        if (
            !RULES_BY_FILETYPE[fileRef.fileType] && fileRef.fileType !== "markdown" &&
            fileRef.fileType !== "text"
        ) {
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
                    }],
                },
            };
            continue;
        }

        const content = await context.skillReader.readTextFile(fileRef.path);
        if (!content) continue;

        next = scanFileForPermissions({
            state: next,
            fileRef,
            content,
        });

        next = applyPromptRegexFindings(next, fileRef.path, content, fileRef.invokedBy);
    }

    return synthesizePermissions(next);
}

function applyPromptRegexFindings(
    state: AnalyzerState,
    filePath: string,
    content: string,
    invokedBy: AnalyzerState["scanQueue"][number]["invokedBy"],
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
                    line: i + 1,
                    type: "content",
                    invokedBy,
                },
                extracted: {},
            });
        }
    }

    return { ...state, findings };
}
