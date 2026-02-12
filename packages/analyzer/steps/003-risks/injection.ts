import { RISK_RULE_MAPPING } from "../../config.ts";
import type { AnalyzerState } from "../../types.ts";
import { addRisk } from "./helpers.ts";

export function analyzeInjectionAndPromptRisks(state: AnalyzerState): AnalyzerState {
    let next = state;

    for (const finding of next.findings) {
        const mapped = RISK_RULE_MAPPING[finding.ruleId];
        if (!mapped) continue;
        if (!["command_injection", "prompt_override"].includes(mapped.type)) continue;

        const permissionIds = mapped.type === "prompt_override"
            ? next.permissions.map((perm) => perm.id)
            : next.permissions.filter((perm) => perm.scope === "sys" || perm.scope === "net").map((
                perm,
            ) => perm.id);

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
