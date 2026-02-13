import type {
    DynamicRuleRiskMapping,
    Permission,
    RuleRiskResult,
    StaticRuleRiskMapping,
} from "skill-lab/shared";
import { classifyDestination, parseUrlFromUnknown } from "../../utils/url-parser.ts";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH"]);

export const DETECT_NETWORK_FETCH_RISKS: DynamicRuleRiskMapping = ({ permission }) => {
    if (!permission) return null;

    const rawUrl = resolveUrl(permission);
    if (!rawUrl) return null;

    const parsed = parseUrlFromUnknown(rawUrl);
    if (!parsed) return null;

    const method = resolveMethod(permission);
    const destination = classifyDestination(parsed.host);
    const hasSecretsInRequest = hasSecretInRequest(permission, rawUrl);
    const results: RuleRiskResult[] = [];

    if (destination === "external") {
        if (WRITE_METHODS.has(method)) {
            results.push({
                code: "NETWORK:data_exfiltration",
                severity: "critical",
                message: `Writes data to external host ${parsed.host} via ${method}`,
                metadata: {
                    host: parsed.host,
                    method,
                    destination,
                    url: parsed.raw,
                },
            });
        } else {
            results.push({
                code: "NETWORK:external_network_access",
                severity: "warning",
                message: `Reads from external host ${parsed.host}`,
                metadata: {
                    host: parsed.host,
                    method,
                    destination,
                    url: parsed.raw,
                },
            });
        }
    }

    if (hasSecretsInRequest) {
        results.push({
            code: destination === "external"
                ? "NETWORK:credential_leak"
                : "NETWORK:localhost_secret_exposure",
            severity: destination === "external" ? "critical" : "warning",
            message: `Potential secret transmission detected for ${parsed.host}`,
            metadata: {
                host: parsed.host,
                method,
                destination,
                url: parsed.raw,
            },
        });
    }

    if (results.length === 0) return null;

    return results;
};

export const DETECT_REMOTE_CODE_EXECUTION_RISK: StaticRuleRiskMapping = {
    code: "NETWORK:remote_code_execution",
    severity: "critical",
    message: "Remote output piped to shell",
};

function resolveUrl(permission: Permission): string | undefined {
    const metadata = permission.metadata ?? {};
    if (typeof metadata.url === "string") return metadata.url;
    if (!Array.isArray(permission.args) || permission.args.length === 0) return undefined;
    return permission.args.find((arg) => /\.|localhost|\//.test(arg));
}

function resolveMethod(permission: Permission): string {
    const metadata = permission.metadata ?? {};
    const raw = typeof metadata.method === "string"
        ? metadata.method
        : inferMethodFromArgs(permission.args);
    return String(raw).toUpperCase();
}

function inferMethodFromArgs(args?: string[]): string {
    if (!args || args.length === 0) return "GET";
    const explicit = args.find((arg) => /^(get|post|put|patch|delete)$/i.test(arg));
    return explicit ? explicit.toUpperCase() : "GET";
}

function hasSecretInRequest(permission: Permission, rawUrl: string): boolean {
    const metadata = permission.metadata ?? {};
    const header = String(metadata.header ?? metadata.headers ?? "");
    return /token|authorization|bearer|api[_-]?key|secret/i.test(
        `${header} ${rawUrl} ${JSON.stringify(metadata)}`,
    );
}
