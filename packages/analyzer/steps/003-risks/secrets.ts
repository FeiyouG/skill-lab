import type { AnalyzerState } from "../../types.ts";
import { isSecretLikeName } from "../../utils/secret-validator.ts";
import { addRisk } from "./helpers.ts";

export function analyzeSecretRisks(state: AnalyzerState): AnalyzerState {
    let next = state;

    for (const finding of next.findings) {
        if (!finding.ruleId.startsWith("secret-")) continue;

        const candidate = normalizeKeyCandidate(finding.extracted.key ?? finding.extracted.var);
        if (!isSecretLikeName(candidate)) continue;

        const permissionIds = next.permissions
            .filter((perm) => perm.scope === "env")
            .filter((perm) =>
                perm.references.some((reference) =>
                    reference.file === finding.reference.file &&
                    reference.line === finding.reference.line
                )
            )
            .map((perm) => perm.id);

        if (permissionIds.length === 0) continue;

        next = addRisk(next, {
            type: "secret_access",
            severity: "warning",
            message: `Potential secret or credential access: ${String(candidate)}`,
            permissionIds,
            reference: finding.reference,
            metadata: finding.extracted,
        });
    }

    return next;
}

function normalizeKeyCandidate(value: unknown): string {
    if (typeof value !== "string") return "";
    return value.replace(/[;,)]+$/, "").trim();
}
