import type { AnalyzerState, Permission } from "../../types.ts";

export function synthesizePermissions(state: AnalyzerState): AnalyzerState {
    const map = new Map<string, Permission>();

    for (const permission of state.permissions) {
        const existing = map.get(permission.id);
        if (!existing) {
            map.set(permission.id, {
                ...permission,
                references: [...permission.references],
                risks: [...permission.risks],
            });
            continue;
        }

        const mergedReferences = [...existing.references, ...permission.references];

        existing.references = dedupeReferences(mergedReferences);
        existing.risks = Array.from(new Set([...existing.risks, ...permission.risks]));
    }

    return {
        ...state,
        permissions: Array.from(map.values()),
    };
}

function dedupeReferences(references: Permission["references"]): Permission["references"] {
    const seen = new Set<string>();
    const result: Permission["references"] = [];
    for (const reference of references) {
        const key = `${reference.file}:${reference.line}:${
            reference.lineEnd ?? reference.line
        }:${reference.type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(reference);
    }
    return result;
}
