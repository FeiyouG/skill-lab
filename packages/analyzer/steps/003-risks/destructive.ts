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

        const permissionIds = permissionsForFinding(next, finding.ruleId);
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

function permissionsForFinding(state: AnalyzerState, ruleId: string): string[] {
    if (ruleId.startsWith("fs-")) {
        return state.permissions.filter((perm) => perm.scope === "fs" || perm.scope === "sys").map((
            perm,
        ) => perm.id);
    }
    if (ruleId.startsWith("shell-")) {
        return state.permissions.filter((perm) => perm.scope === "sys").map((perm) => perm.id);
    }
    return [];
}
