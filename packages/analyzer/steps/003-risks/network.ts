import type { AnalyzerState } from "../../types.ts";
import { classifyDestination, parseUrlFromUnknown } from "../../utils/url-parser.ts";
import { addRisk } from "./helpers.ts";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH"]);

export function analyzeNetworkRisks(state: AnalyzerState): AnalyzerState {
    let next = state;
    const netPermissions = next.permissions.filter((perm) =>
        perm.scope === "net" && perm.permission === "fetch"
    );

    for (const perm of netPermissions) {
        const metadata = perm.metadata ?? {};
        const rawUrl = typeof metadata.url === "string"
            ? metadata.url
            : Array.isArray(perm.args) && perm.args.length > 0
            ? perm.args.find((arg) => /\.|localhost|\//.test(arg))
            : undefined;

        if (!rawUrl) continue;

        const parsed = parseUrlFromUnknown(rawUrl);
        if (!parsed) continue;

        const method = String(metadata.method ?? inferMethodFromArgs(perm.args)).toUpperCase();
        const destination = classifyDestination(parsed.host);
        const header = String(metadata.header ?? metadata.headers ?? "");
        const hasSecretsInRequest = /token|authorization|bearer|api[_-]?key|secret/i.test(
            `${header} ${rawUrl} ${JSON.stringify(metadata)}`,
        );

        if (destination === "external") {
            if (WRITE_METHODS.has(method)) {
                next = addRisk(next, {
                    type: "data_exfiltration",
                    severity: "critical",
                    message: `Writes data to external host ${parsed.host} via ${method}`,
                    permissionIds: [perm.id],
                    reference: perm.references[0],
                    metadata: { host: parsed.host, method, destination, url: parsed.raw },
                });
            } else {
                next = addRisk(next, {
                    type: "external_network_access",
                    severity: "warning",
                    message: `Reads from external host ${parsed.host}`,
                    permissionIds: [perm.id],
                    reference: perm.references[0],
                    metadata: { host: parsed.host, method, destination, url: parsed.raw },
                });
            }
        }

        if (hasSecretsInRequest) {
            next = addRisk(next, {
                type: destination === "external" ? "credential_leak" : "localhost_secret_exposure",
                severity: destination === "external" ? "critical" : "warning",
                message: `Potential secret transmission detected for ${parsed.host}`,
                permissionIds: [perm.id],
                reference: perm.references[0],
                metadata: { host: parsed.host, method, destination, url: parsed.raw },
            });
        }
    }

    const pipeToShellPerms = next.permissions.filter(
        (perm) => perm.tool === "bash" && /curl|wget/i.test(String(perm.metadata?.command ?? "")),
    );
    for (const perm of pipeToShellPerms) {
        next = addRisk(next, {
            type: "remote_code_execution",
            severity: "critical",
            message: "Remote output piped to shell",
            permissionIds: [perm.id],
            reference: perm.references[0],
            metadata: { command: perm.metadata?.command },
        });
        next = {
            ...next,
            warnings: [
                ...next.warnings,
                "Remote script content analysis is NOT_IMPLEMENTED",
            ],
        };
    }

    return next;
}

function inferMethodFromArgs(args?: string[]): string {
    if (!args || args.length === 0) return "GET";
    const explicit = args.find((arg) => /^(get|post|put|patch|delete)$/i.test(arg));
    return explicit ? explicit.toUpperCase() : "GET";
}
