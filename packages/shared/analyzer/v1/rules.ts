/**
 * Detection rules: permission mappings, risk patterns, severity levels.
 */
import type { PermissionValue, RiskItem, RiskSeverity } from "./types.ts";

export const PERMISSION_LABELS: Record<PermissionValue, string> = {
    "fs:read": "Read files",
    "fs:write": "Write files",
    "sys:shell": "Run shell commands",
    "sys:subprocess": "Spawn subprocesses",
    "sys:sudo": "Use elevated privileges",
    "net:fetch": "Access the network",
    "net:server": "Run a local server",
    "env:read": "Read environment variables",
    "hooks:run": "Run hooks",
    "data:collect": "Collect data",
    "data:send": "Send data",
    "data:notify": "Notify users",
};

export const PERMISSION_DETECTORS = {
    // Maps allowed-tools to permissions
    allowToolsToPermissions: new Map<string, PermissionValue[]>([
        ["bash", ["sys:shell"]],
        ["shell", ["sys:shell"]],
        ["subprocess", ["sys:subprocess"]],
        ["webfetch", ["net:fetch"]],
        ["fetch", ["net:fetch"]],
        ["read", ["fs:read"]],
        ["write", ["fs:write"]],
        ["edit", ["fs:write"]],
    ]),
    // Content patterns → permissions
    contentPatterns: new Map<RegExp, PermissionValue[]>([
        [/\bfetch\(|https?:\/\//i, ["net:fetch"]], // Network requests
        [/\bBash\(/i, ["sys:shell"]], // Shell tool
        [/\bsubprocess\b|child_process|spawn\(/i, ["sys:subprocess"]], // Process spawn
        [/\bsudo\b/i, ["sys:sudo"]], // Elevated privileges
        [/\benv\b|process\.env|Deno\.env|getenv\(/i, ["env:read"]], // Env access
        [/\.hooks\.json|hooks?\b/i, ["hooks:run"]], // Hooks
    ]),
};

export const RISK_RULES = {
    promptInjection: { type: "prompt_injection", severity: "critical" as RiskSeverity },
    dynamicInjection: { type: "dynamic_injection", severity: "warning" as RiskSeverity },
    secretAccess: { type: "secret_access", severity: "warning" as RiskSeverity },
    credentialLeak: { type: "credential_leak", severity: "critical" as RiskSeverity },
    destructiveBehavior: { type: "destructive_behavior", severity: "critical" as RiskSeverity },
    configTampering: { type: "config_tampering", severity: "warning" as RiskSeverity },
    privilegeEscalation: { type: "privilege_escalation", severity: "critical" as RiskSeverity },
    persistence: { type: "persistence", severity: "warning" as RiskSeverity },
    obfuscation: { type: "obfuscation", severity: "warning" as RiskSeverity },
    dataExfiltration: { type: "data_exfiltration", severity: "critical" as RiskSeverity },
};

export const RISK_PATTERNS = {
    promptInjection: [/ignore previous|system prompt|forget (your|previous) rules/i],
    dynamicInjection: [/!`[^`]+`|\$\([^\)]+\)/], // Command substitution
    secretAccess: [/\.env|credentials|secret|token|api[_-]?key|\.ssh|\.aws/i],
    destructive: [/rm\s+-rf|del\s+\/s|format\s+[a-z]:/i],
    config: [/settings\.json|settings\.local\.json|config\./i],
    privilege: [/\bsudo\b|root\b|chmod\s+777/i],
    persistence: [/cron|crontab|launchd|systemd|\.bashrc|\.zshrc|pre-commit/i],
    obfuscation: [/base64|eval\(|exec\(|obfuscat/i],
    dataExfiltration: [/curl|wget|http[s]?:\/\//i],
};

export function buildRisk(
    type: string,
    severity: RiskSeverity,
    permission?: PermissionValue,
    reference?: string,
    message?: string,
): RiskItem {
    return { type, severity, permission, reference, message };
}
