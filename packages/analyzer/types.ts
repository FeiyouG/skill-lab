import type { SkillFile, SkillFrontmatter, SkillReader } from "@FeiyouG/skill-lab";

export type PermissionScope = "fs" | "sys" | "net" | "env" | "hooks" | "data";
export type ReferenceType = "frontmatter" | "content" | "script" | "inline";
export type Severity = "info" | "warning" | "critical";

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

export type FileRole =
    | "entrypoint"
    | "license"
    | "readme"
    | "reference"
    | "config"
    | "script"
    | "regular";

export type SourceType = "local" | "external";

export type Reference = {
    file: string;
    line: number;
    lineEnd?: number;
    type: ReferenceType;
    invokedBy?: Reference;
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
    type: string;
    severity: Severity;
    message: string;
    reference: Reference;
    permissions: string[];
    metadata?: Record<string, unknown>;
};

export type FileReference = {
    path: string;
    sourceType: SourceType;
    fileType: FileType;
    role: FileRole;
    depth: number;
    invokedBy?: Reference;
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
    version: string;
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
        frontmatterRangeEnd?: number;
        config: AnalyzerConfig;
    };
};

export type AnalyzerResult = {
    version: string;
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
