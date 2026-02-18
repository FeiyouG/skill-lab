import { evalRuleRiskMappings, RULES_BY_ID } from "../../rules/mod.ts";
import type { AnalyzerState } from "../../types.ts";
import type { Finding, Permission, RiskCode } from "skill-lab/shared";
import { addRisk } from "./helpers.ts";

const PROMPT_CATEGORY = "PROMPT";
const INJECTION_CATEGORY = "INJECTION";
const NETWORK_CATEGORY = "NETWORK";
const SECRETS_CATEGORY = "SECRETS";
const DESTRUCTIVE_CATEGORIES = new Set(["DESTRUCTIVE", "PRIVILEGE", "PERSISTENCE"]);

export function analyzeRuleMappedRisks(
    state: AnalyzerState,
    onFindingProcessed?: () => void,
): AnalyzerState {
    let next = state;

    for (const finding of next.findings) {
        const rule = RULES_BY_ID.get(finding.ruleId);
        if (!rule) continue;

        const matchedPermission = resolvePermissionForFinding(next, finding);
        const mapped = evalRuleRiskMappings(rule, { permission: matchedPermission, finding });

        for (const risk of mapped) {
            const permissionIds = selectPermissionIds(next, finding, risk.code, matchedPermission);
            if (permissionIds.length === 0) continue;

            next = addRisk(next, {
                type: risk.code,
                severity: risk.severity,
                message: risk.message,
                permissionIds,
                reference: finding.reference,
                metadata: risk.metadata ?? finding.extracted,
            });
        }

        onFindingProcessed?.();
    }

    return next;
}

function resolvePermissionForFinding(
    state: AnalyzerState,
    finding: Finding,
): Permission | undefined {
    return state.permissions.find((permission) => overlaps(permission, finding));
}

function selectPermissionIds(
    state: AnalyzerState,
    finding: Finding,
    code: RiskCode,
    matchedPermission: Permission | undefined,
): string[] {
    const category = code.split(":", 1)[0];

    if (category === PROMPT_CATEGORY) {
        return state.permissions.map((perm) => perm.id);
    }

    if (category === INJECTION_CATEGORY) {
        return state.permissions
            .filter((perm) => perm.scope === "sys" || perm.scope === "net")
            .map((perm) => perm.id);
    }

    if (category === NETWORK_CATEGORY) {
        if (code === "NETWORK:remote_code_execution") {
            return state.permissions
                .filter((perm) => perm.scope === "sys")
                .filter((perm) => overlaps(perm, finding))
                .map((perm) => perm.id);
        }
        return matchedPermission ? [matchedPermission.id] : [];
    }

    if (category === SECRETS_CATEGORY) {
        return state.permissions
            .filter((perm) => perm.scope === "env")
            .filter((perm) => overlaps(perm, finding))
            .map((perm) => perm.id);
    }

    if (DESTRUCTIVE_CATEGORIES.has(category)) {
        const scopedPermissions = state.permissions.filter((perm) => {
            if (finding.ruleId.startsWith("fs-")) {
                return perm.scope === "fs" || perm.scope === "sys";
            }
            return perm.scope === "sys";
        });

        return scopedPermissions.filter((perm) => overlaps(perm, finding)).map((perm) => perm.id);
    }

    return [];
}

function overlaps(permission: Permission, finding: Finding): boolean {
    return permission.references.some((reference) =>
        reference.file === finding.reference.file &&
        reference.line <= (finding.reference.lineEnd ?? finding.reference.line) &&
        (reference.lineEnd ?? reference.line) >= finding.reference.line
    );
}
