import type { AnalyzerState } from "../../types.ts";
import type { Risk, RiskCode, Severity } from "skill-lab/shared";
import { generateRiskId } from "../../utils/id-generator.ts";

export function addRisk(
    state: AnalyzerState,
    input: {
        type: RiskCode;
        severity: Severity;
        message: string;
        permissionIds: string[];
        reference: AnalyzerState["findings"][number]["reference"];
        metadata?: Record<string, unknown>;
    },
): AnalyzerState {
    const risk: Risk = {
        id: generateRiskId(input.type, state.risks.length),
        type: input.type,
        severity: input.severity,
        message: input.message,
        reference: input.reference,
        permissions: input.permissionIds,
        metadata: input.metadata,
    };

    const permissions = state.permissions.map((perm) => {
        if (!input.permissionIds.includes(perm.id)) return perm;
        return {
            ...perm,
            risks: Array.from(new Set([...perm.risks, risk.id])),
        };
    });

    return {
        ...state,
        permissions,
        risks: [...state.risks, risk],
    };
}
