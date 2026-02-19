import { Finding } from "./findings.ts";
import { Permission } from "./permissions.ts";
import { Reference } from "./references.ts";

export type Severity = "info" | "warning" | "critical";

type NETWORK_RISK_CODES =
    | "NETWORK:data_exfiltration"
    | "NETWORK:external_network_access"
    | "NETWORK:remote_code_execution"
    | "NETWORK:credential_leak"
    | "NETWORK:localhost_secret_exposure";

type INJECTION_RISK_CODES = "INJECTION:command_injection";

type PROMPT_RISK_CODES = "PROMPT:prompt_override";

type DESTRUCTIVE_RISK_CODES =
    | "DESTRUCTIVE:destructive_behavior"
    | "DESTRUCTIVE:permission_weakening";

type PRIVILEGE_RISK_CODES = "PRIVILEGE:privilege_escalation";

type PERSISTENCE_RISK_CODES = "PERSISTENCE:persistence";

type SECRETS_RISK_CODES = "SECRETS:secret_access";

type DEPENDENCY_RISK_CODES = "DEPENDENCY:external_import";

type REFERENCE_RISK_CODES = "REFERENCE:external_file";

export type RiskCode =
    | NETWORK_RISK_CODES
    | INJECTION_RISK_CODES
    | PROMPT_RISK_CODES
    | DESTRUCTIVE_RISK_CODES
    | PRIVILEGE_RISK_CODES
    | PERSISTENCE_RISK_CODES
    | SECRETS_RISK_CODES
    | DEPENDENCY_RISK_CODES
    | REFERENCE_RISK_CODES;

export type RuleRiskResult = {
    code: RiskCode;
    severity: Severity;
    message: string;
    metadata?: Record<string, unknown>;
};

export type RuleRiskInput = {
    permission?: Permission;
    finding: Finding;
};

export type Risk = {
    id: string;
    type: RiskCode;
    groupKey?: string;
    severity: Severity;
    message: string;
    reference: Reference;
    permissions: string[];
    metadata?: Record<string, unknown>;
};

export type StaticRuleRiskMapping = RuleRiskResult;

export type DynamicRuleRiskMapping = (
    input: RuleRiskInput,
) => RuleRiskResult | RuleRiskResult[] | null;

export type RuleRiskMapping = StaticRuleRiskMapping | DynamicRuleRiskMapping;
