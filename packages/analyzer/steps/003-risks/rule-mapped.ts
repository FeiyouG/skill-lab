import { evalRuleRiskMappings, RULES_BY_ID } from "../../rules/mod.ts";
import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import type { Finding, Permission, RiskCode } from "skill-lab/shared";
import { addRisk } from "./helpers.ts";
import { isAllowed, isDenied, isNetworkAllowed, isNetworkDenied } from "./policy.ts";
import type { TreesitterGrammar } from "../../treesitter/registry.ts";
import { GRAMMAR_SPECS } from "../../treesitter/registry.ts";

const PROMPT_CATEGORY = "PROMPT";
const INJECTION_CATEGORY = "INJECTION";
const NETWORK_CATEGORY = "NETWORK";
const SECRETS_CATEGORY = "SECRETS";
const DESTRUCTIVE_CATEGORIES = new Set(["DESTRUCTIVE", "PRIVILEGE", "PERSISTENCE"]);

export function analyzeRuleMappedRisks(
    state: AnalyzerState,
    context: Pick<AnalyzerContext, "config">,
    onFindingProcessed?: () => void,
): AnalyzerState {
    let next = state;

    for (const finding of next.findings) {
        const rule = RULES_BY_ID.get(finding.ruleId);
        if (!rule) continue;

        const matchedPermission = resolvePermissionForFinding(next, finding);
        const mapped = evalRuleRiskMappings(rule, { permission: matchedPermission, finding });

        for (const risk of mapped) {
            const policy = resolvePolicyForRisk({
                context,
                rule,
                finding,
                permission: matchedPermission,
                risk,
            });
            if (policy.skip) continue;

            const permissionIds = selectPermissionIds(next, finding, risk.code, matchedPermission);
            if (permissionIds.length === 0) continue;

            next = addRisk(next, {
                type: risk.code,
                groupKey: matchedPermission ? `${risk.code}:${matchedPermission.tool}` : risk.code,
                severity: risk.severity,
                message: risk.message,
                permissionIds,
                reference: finding.reference,
                metadata: policy.metadata,
            });
        }

        onFindingProcessed?.();
    }

    return next;
}

function resolvePolicyForRisk(input: {
    context: Pick<AnalyzerContext, "config">;
    rule: ReturnType<typeof RULES_BY_ID.get>;
    finding: Finding;
    permission: Permission | undefined;
    risk: { code: RiskCode; metadata?: Record<string, unknown> };
}): { skip: boolean; metadata?: Record<string, unknown> } {
    const { context, rule, finding, permission, risk } = input;
    const baseMetadata = (risk.metadata ?? finding.extracted) as
        | Record<string, unknown>
        | undefined;
    const policyMetadata: Record<string, unknown> = {};

    if (risk.code.startsWith("NETWORK:")) {
        const host = resolveHost(baseMetadata);
        if (host) {
            if (isNetworkDenied(context.config, host)) {
                policyMetadata.network = { host, source: "denylist" };
            } else if (isNetworkAllowed(context.config, host)) {
                return { skip: true };
            }
        }
    }

    const grammar = resolveRuleGrammar(rule);
    const importName = resolveImportName(finding, permission);
    if (grammar && importName) {
        if (isDenied(context.config, grammar, importName)) {
            policyMetadata.language = { grammar, importName, source: "denylist" };
        } else if (isAllowed(context.config, grammar, importName)) {
            return { skip: true };
        }
    }

    const metadata = Object.keys(policyMetadata).length
        ? { ...(baseMetadata ?? {}), policy: policyMetadata }
        : baseMetadata;

    return { skip: false, metadata };
}

function resolveRuleGrammar(
    rule: ReturnType<typeof RULES_BY_ID.get>,
): TreesitterGrammar | null {
    if (!rule) return null;
    if ("grammar" in rule && typeof rule.grammar === "string") {
        return rule.grammar in GRAMMAR_SPECS ? (rule.grammar as TreesitterGrammar) : null;
    }
    return null;
}

function resolveImportName(
    finding: Finding,
    permission: Permission | undefined,
): string | undefined {
    const extracted = finding.extracted as Record<string, unknown> | undefined;
    const candidates = [
        extracted?.import,
        extracted?.module,
        extracted?.package,
        extracted?.dependency,
    ];

    for (const value of candidates) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }

    if (permission?.metadata) {
        const meta = permission.metadata as Record<string, unknown>;
        const metaCandidates = [meta.import, meta.module, meta.package, meta.dependency];
        for (const value of metaCandidates) {
            if (typeof value === "string" && value.trim()) return value.trim();
        }
    }

    return undefined;
}

function resolveHost(metadata?: Record<string, unknown>): string | undefined {
    if (!metadata) return undefined;
    const raw = metadata.host;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return undefined;
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
