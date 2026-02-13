import type { SkillFile, SkillFrontmatter, SkillReader } from "@FeiyouG/skill-lab";

export type PermissionScope = "fs" | "sys" | "net" | "env" | "hooks" | "data";
export type ReferenceType = "frontmatter" | "content" | "script" | "inline";
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

export type RiskCode =
    | NETWORK_RISK_CODES
    | INJECTION_RISK_CODES
    | PROMPT_RISK_CODES
    | DESTRUCTIVE_RISK_CODES
    | PRIVILEGE_RISK_CODES
    | PERSISTENCE_RISK_CODES
    | SECRETS_RISK_CODES;

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

export type StaticRuleRiskMapping = RuleRiskResult;

export type DynamicRuleRiskMapping = (
    input: RuleRiskInput,
) => RuleRiskResult | RuleRiskResult[] | null;

export type RuleRiskMapping = StaticRuleRiskMapping | DynamicRuleRiskMapping;

export type Frontmatter = Partial<SkillFrontmatter>;

export type FileType =
    | "markdown"
    | "text"
    | "bash"
    | "javascript"
    | "typescript"
    | "python"
    | "json"
    | "yaml"
    | "binary"
    | "unknown";

export type CodeBlock = {
    language: FileType;
    content: string;
    startLine: number;
    endLine: number;
    type: ReferenceType;
};

export type FileRole =
    | "entrypoint"
    | "license"
    | "readme"
    | "reference"
    | "config"
    | "script"
    | "regular"
    | "host-fs"; // path targeting the host filesystem (not a skill-local file)

export type SourceType = "local" | "external";

export type Reference = {
    file: string;
    line: number;
    lineEnd?: number;
    type: ReferenceType;
    referencedBy?: Reference;
};

export type Permission = {
    id: string;
    tool: string;
    scope: PermissionScope;
    permission: string;
    args?: string[];
    fileRole?: FileRole;
    metadata?: Record<string, unknown>;
    references: Reference[];
    source: "frontmatter" | "detected" | "inferred";
    comment?: string;
    risks: string[];
};

export type Risk = {
    id: string;
    type: RiskCode;
    severity: Severity;
    message: string;
    reference: Reference;
    permissions: string[];
    metadata?: Record<string, unknown>;
};

export type FileReference = {
    /** The relative path of file to the root of the skill */
    path: string;
    sourceType: SourceType;
    fileType: FileType;
    role: FileRole;
    depth: number;
    referencedBy?: Reference;
    /** How this reference was discovered during file extraction. */
    discoveryMethod?:
        | "markdown-link"
        | "inline-code"
        | "bare-path"
        | "import"
        | "url"
        | "source"
        | "code-block";
};

export type Finding = {
    ruleId: string;
    reference: Reference;
    extracted: Record<string, unknown>;
};

export type AnalyzerConfig = {
    maxFileSize: number;
    maxFileCount: number;
    maxScanDepth: number;
};

export type AnalyzerState = {
    skillId: string;
    skillVersionId: string;
    files: SkillFile[];
    frontmatter: Frontmatter;
    scanQueue: FileReference[];
    permissions: Permission[];
    findings: Finding[];
    risks: Risk[];
    warnings: string[];
    metadata: {
        scannedFiles: string[];
        skippedFiles: Array<{ path: string; reason: string }>;
        rulesUsed: string[];
        config: AnalyzerConfig;
    };
};

export type AnalyzerResult = {
    analyzedAt: string;
    skillId: string;
    skillVersionId: string;
    permissions: Permission[];
    risks: Risk[];
    score: number;
    riskLevel: "safe" | "caution" | "attention" | "risky" | "avoid";
    summary: string;
    warnings: string[];
    metadata: {
        scannedFiles: string[];
        skippedFiles: Array<{ path: string; reason: string }>;
        rulesUsed: string[];
        frontmatterRangeEnd?: number;
        config: AnalyzerConfig;
    };
};

export type AnalyzerContext = {
    skillReader: SkillReader;
};
