import { RISK_RULE_MAPPING } from "../../config.ts";
import type { AnalyzerState } from "../../types.ts";
import { addRisk } from "./helpers.ts";

export function analyzeDestructiveAndPrivilegeRisks(state: AnalyzerState): AnalyzerState {
    let next = state;

    for (const finding of next.findings) {
        const mapped = RISK_RULE_MAPPING[finding.ruleId];
        if (!mapped) continue;
        if (
            !["destructive_behavior", "permission_weakening", "privilege_escalation", "persistence"]
                .includes(mapped.type)
        ) {
            continue;
        }

        const permissionIds = permissionsForFinding(next, finding);
        if (permissionIds.length === 0) continue;

        next = addRisk(next, {
            type: mapped.type,
            severity: mapped.severity,
            message: mapped.type.replace(/_/g, " "),
            permissionIds,
            reference: finding.reference,
            metadata: finding.extracted,
        });
    }

    return next;
}

function permissionsForFinding(
    state: AnalyzerState,
    finding: AnalyzerState["findings"][number],
): string[] {
    if (!finding.ruleId.startsWith("fs-") && !finding.ruleId.startsWith("shell-")) return [];

    const scopedPermissions = state.permissions.filter((perm) => {
        if (finding.ruleId.startsWith("fs-")) {
            return perm.scope === "fs" || perm.scope === "sys";
        }
        return perm.scope === "sys";
    });

    const matched = scopedPermissions.filter((perm) =>
        perm.references.some((reference) =>
            reference.file === finding.reference.file &&
            reference.line <= (finding.reference.lineEnd ?? finding.reference.line) &&
            (reference.lineEnd ?? reference.line) >= finding.reference.line
        )
    );

    return matched.map((perm) => perm.id);
}
