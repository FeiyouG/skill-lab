import type { AnalyzerResult } from "@FeiyouG/skill-lab-analyzer";

const INDENT = "  ";

export function formatAnalyzeResult(result: AnalyzerResult): string {
    const lines: string[] = [];

    lines.push("=".repeat(60))
    lines.push("Analysis Results");
    lines.push("=".repeat(60))

    lines.push(`${INDENT}Skill: ${result.skillId}@${result.skillVersionId}`);

    lines.push("");
    lines.push(`${INDENT}Permissions (${result.permissions.length})`);
    if (result.permissions.length === 0) {
        lines.push(`${INDENT.repeat(2)}- none`);
    } else {
        for (const permission of result.permissions) {
            lines.push(
                `${INDENT.repeat(2)}- ${permission.tool}.${permission.permission} [${permission.scope}]`,
            );
            if (permission.args && permission.args.length > 0) {
                lines.push(`${INDENT.repeat(3)}args: ${permission.args.join(", ")}`);
            }
            lines.push(`${INDENT.repeat(3)}source: ${permission.source}`);
            if (permission.references.length > 0) {
                lines.push(`${INDENT.repeat(3)}ref: ${formatReference(permission.references[0])}`);
            }
        }
    }

    lines.push("");
    lines.push(`${INDENT}Risks (${result.risks.length})`);
    if (result.risks.length === 0) {
        lines.push(`${INDENT.repeat(2)}- none`);
    } else {
        for (const risk of result.risks) {
            lines.push(`${INDENT.repeat(2)}- ${risk.severity} ${risk.type}`);

            lines.push(`${INDENT.repeat(3)}message: ${risk.message}`);
            lines.push(`${INDENT.repeat(3)}ref: ${formatReference(risk.reference)}`);
            if (risk.permissions.length > 0) {
                lines.push(`${INDENT.repeat(3)}permissions: ${risk.permissions.join(", ")}`);
            }
        }
    }

    lines.push("");
    lines.push(`${INDENT}Warnings (${result.warnings.length})`);
    if (result.warnings.length === 0) {
        lines.push(`${INDENT.repeat(2)}- none`);
    } else {
        for (const warning of result.warnings) {
            lines.push(`${INDENT.repeat(3)}- ${warning}`);
        }
    }

    lines.push("")
    lines.push(`${INDENT}Risk Level: ${result.riskLevel}`);
    lines.push(`${INDENT}Score: ${result.score}`);
    lines.push(`${INDENT}Summary: ${result.summary}`);

    return lines.join("\n");
}

function formatReference(reference: {
    file: string;
    line: number;
    lineEnd?: number;
    type: string;
}): string {
    if (reference.lineEnd !== undefined && reference.lineEnd !== reference.line) {
        return `${reference.file}:${reference.line}-${reference.lineEnd} (${reference.type})`;
    }
    return `${reference.file}:${reference.line} (${reference.type})`;
}
