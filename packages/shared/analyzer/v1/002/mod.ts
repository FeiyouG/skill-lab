/**
 * Step 2: Detects security risks using pattern matching and permission gating.
 */
import type {
    AnalysisRisks,
    AnalyzerContext,
    AnalyzerState,
    PermissionValue,
    RiskItem,
} from "../types.ts";
import { buildRisk, RISK_PATTERNS, RISK_RULES } from "../rules.ts";
import { findLineReferences, mergeReferences } from "../utils.ts";
import { contentTypeFromPath } from "@FeiyouG/skill-lab";

// Risks only flagged if skill has required permissions
const PERMISSION_GATES: Record<string, PermissionValue[]> = {
    secret_access: ["fs:read", "env:read"],
    credential_leak: ["fs:read", "env:read", "net:fetch"],
    destructive_behavior: ["fs:write"],
    config_tampering: ["fs:write"],
    privilege_escalation: ["sys:sudo"],
    persistence: ["sys:shell", "sys:subprocess"],
    data_exfiltration: ["net:fetch"],
};

export async function runStep2(
    state: AnalyzerState,
    context: AnalyzerContext,
): Promise<AnalyzerState> {
    const files = state.files ?? [];
    const permissions = new Set<PermissionValue>(state.permissions?.list ?? []);
    const risks: RiskItem[] = [];
    const references: Record<string, string[]> = {};

    for (const file of files) {
        const contentType = file.contentType ?? contentTypeFromPath(file.path);
        if (contentType !== "text") continue;
        const content = await context.skillReader.readTextFile(file.path);
        if (!content) continue;

        if (RISK_PATTERNS.promptInjection.some((pattern) => pattern.test(content))) {
            const refs = findLineReferences(content, RISK_PATTERNS.promptInjection[0], file.path);
            risks.push(
                buildRisk(
                    RISK_RULES.promptInjection.type,
                    RISK_RULES.promptInjection.severity,
                    undefined,
                    refs[0],
                ),
            );
            mergeReferences(references, RISK_RULES.promptInjection.type, refs);
        }

        if (RISK_PATTERNS.dynamicInjection.some((pattern) => pattern.test(content))) {
            const refs = findLineReferences(content, RISK_PATTERNS.dynamicInjection[0], file.path);
            risks.push(
                buildRisk(
                    RISK_RULES.dynamicInjection.type,
                    RISK_RULES.dynamicInjection.severity,
                    undefined,
                    refs[0],
                ),
            );
            mergeReferences(references, RISK_RULES.dynamicInjection.type, refs);
        }

        const secretRefs = findLineReferences(content, RISK_PATTERNS.secretAccess[0], file.path);
        if (secretRefs.length && hasPermissions(permissions, PERMISSION_GATES.secret_access)) {
            risks.push(
                buildRisk(
                    RISK_RULES.secretAccess.type,
                    RISK_RULES.secretAccess.severity,
                    pickPermission(permissions, PERMISSION_GATES.secret_access),
                    secretRefs[0],
                ),
            );
            mergeReferences(references, RISK_RULES.secretAccess.type, secretRefs);
        }

        const destructiveRefs = findLineReferences(
            content,
            RISK_PATTERNS.destructive[0],
            file.path,
        );
        if (
            destructiveRefs.length &&
            hasPermissions(permissions, PERMISSION_GATES.destructive_behavior)
        ) {
            risks.push(
                buildRisk(
                    RISK_RULES.destructiveBehavior.type,
                    RISK_RULES.destructiveBehavior.severity,
                    "fs:write",
                    destructiveRefs[0],
                ),
            );
            mergeReferences(references, RISK_RULES.destructiveBehavior.type, destructiveRefs);
        }

        const configRefs = findLineReferences(content, RISK_PATTERNS.config[0], file.path);
        if (configRefs.length && hasPermissions(permissions, PERMISSION_GATES.config_tampering)) {
            risks.push(
                buildRisk(
                    RISK_RULES.configTampering.type,
                    RISK_RULES.configTampering.severity,
                    "fs:write",
                    configRefs[0],
                ),
            );
            mergeReferences(references, RISK_RULES.configTampering.type, configRefs);
        }

        const privilegeRefs = findLineReferences(content, RISK_PATTERNS.privilege[0], file.path);
        if (
            privilegeRefs.length &&
            hasPermissions(permissions, PERMISSION_GATES.privilege_escalation)
        ) {
            risks.push(
                buildRisk(
                    RISK_RULES.privilegeEscalation.type,
                    RISK_RULES.privilegeEscalation.severity,
                    "sys:sudo",
                    privilegeRefs[0],
                ),
            );
            mergeReferences(references, RISK_RULES.privilegeEscalation.type, privilegeRefs);
        }

        const persistenceRefs = findLineReferences(
            content,
            RISK_PATTERNS.persistence[0],
            file.path,
        );
        if (persistenceRefs.length && hasPermissions(permissions, PERMISSION_GATES.persistence)) {
            risks.push(
                buildRisk(
                    RISK_RULES.persistence.type,
                    RISK_RULES.persistence.severity,
                    pickPermission(permissions, PERMISSION_GATES.persistence),
                    persistenceRefs[0],
                ),
            );
            mergeReferences(references, RISK_RULES.persistence.type, persistenceRefs);
        }

        const obfuscationRefs = findLineReferences(
            content,
            RISK_PATTERNS.obfuscation[0],
            file.path,
        );
        if (obfuscationRefs.length) {
            risks.push(
                buildRisk(
                    RISK_RULES.obfuscation.type,
                    RISK_RULES.obfuscation.severity,
                    undefined,
                    obfuscationRefs[0],
                ),
            );
            mergeReferences(references, RISK_RULES.obfuscation.type, obfuscationRefs);
        }

        const exfilRefs = findLineReferences(content, RISK_PATTERNS.dataExfiltration[0], file.path);
        if (exfilRefs.length && hasPermissions(permissions, PERMISSION_GATES.data_exfiltration)) {
            risks.push(
                buildRisk(
                    RISK_RULES.dataExfiltration.type,
                    RISK_RULES.dataExfiltration.severity,
                    "net:fetch",
                    exfilRefs[0],
                ),
            );
            mergeReferences(references, RISK_RULES.dataExfiltration.type, exfilRefs);
        }
    }

    const risksResult: AnalysisRisks = {
        list: risks,
        references: Object.keys(references).length ? references : undefined,
    };

    return {
        ...state,
        risks: risksResult,
    };
}

function hasPermissions(
    permissions: Set<PermissionValue>,
    needed: PermissionValue[],
): boolean {
    return needed.some((perm) => permissions.has(perm));
}

function pickPermission(
    permissions: Set<PermissionValue>,
    needed: PermissionValue[],
): PermissionValue | undefined {
    return needed.find((perm) => permissions.has(perm));
}
