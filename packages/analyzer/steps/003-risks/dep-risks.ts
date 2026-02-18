import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import type { Permission, Reference } from "skill-lab/shared";
import { addRisk } from "./helpers.ts";
import { isAllowed, isDenied } from "./policy.ts";
import type { TreesitterGrammar } from "../../treesitter/registry.ts";
import { GRAMMAR_SPECS } from "../../treesitter/registry.ts";

export function analyzeDependencyRisks(
    state: AnalyzerState,
    context: Pick<AnalyzerContext, "config">,
): AnalyzerState {
    let next = state;

    for (const permission of next.permissions) {
        if (permission.scope !== "dep") continue;

        if (permission.permission === "import") {
            const grammar = resolveGrammar(permission.tool);
            const importName = permission.args?.[0]?.trim();
            if (!importName) continue;
            const groupKey = `DEPENDENCY:external_import:${grammar ?? "unknown"}`;

            if (grammar && isDenied(context.config, grammar, importName)) {
                next = addRisk(next, {
                    type: "DEPENDENCY:external_import",
                    groupKey,
                    severity: "critical",
                    message:
                        `Import '${importName}' is denied by config for ${grammar} and may execute untrusted dependency code.`,
                    permissionIds: [permission.id],
                    reference: resolvePrimaryReference(permission),
                    metadata: { policy: { language: { grammar, importName, source: "denylist" } } },
                });
                continue;
            }

            if (grammar && isAllowed(context.config, grammar, importName)) {
                continue;
            }

            next = addRisk(next, {
                type: "DEPENDENCY:external_import",
                groupKey,
                severity: "warning",
                message: `External import not explicitly configured: ${importName}`,
                permissionIds: [permission.id],
                reference: resolvePrimaryReference(permission),
                metadata: grammar
                    ? { policy: { language: { grammar, importName, source: "default" } } }
                    : undefined,
            });
            continue;
        }

        if (permission.permission === "externalreference") {
            const discoveryMethod = permission.metadata?.discoveryMethod;
            const path = permission.args?.[0] ?? permission.tool;
            const isSourceInclude = discoveryMethod === "source";

            next = addRisk(next, {
                type: "REFERENCE:external_file",
                groupKey: `REFERENCE:external_file:${permission.tool}`,
                severity: "warning",
                message: isSourceInclude
                    ? `Sourced external file not analyzed yet: ${path}`
                    : `External reference not analyzed yet: ${path}`,
                permissionIds: [permission.id],
                reference: resolvePrimaryReference(permission),
                metadata: isSourceInclude ? { discoveryMethod: "source" } : undefined,
            });
        }
    }

    return next;
}

function resolveGrammar(tool: string): TreesitterGrammar | null {
    return tool in GRAMMAR_SPECS ? (tool as TreesitterGrammar) : null;
}

function resolvePrimaryReference(permission: Permission): Reference {
    const reference = permission.references[0];
    if (reference) return reference;
    return {
        file: "SKILL.md",
        line: 1,
        type: "content",
    };
}
