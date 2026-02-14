import type { SkillFile, SkillReader } from "@FeiyouG/skill-lab";
import type {
    FileRefDiscoveryMethod,
    FileReference,
    FileType,
    Finding,
    Frontmatter,
    Permission,
    Reference,
    ReferenceType,
    Risk,
} from "skill-lab/shared";
import { AstGrepClient } from "./astgrep/client.ts";
import { TreesitterClient } from "./treesiter/client.ts";

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
        skippedFiles: Array<{ path: string; reason: string, referenceBy?: Reference}>;
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
    treesitterClient: TreesitterClient;
    astgrepClient: AstGrepClient;
};

/** A file path or package reference discovered in source content. */
export type FileRefDiscovery = {
    path: string;
    line: number;
    via: FileRefDiscoveryMethod;
};

export type CodeBlock = {
    language: FileType;
    content: string;
    startLine: number;
    endLine: number;
    type: ReferenceType;
};

export type FileTypeConfig = {
    extractCodeBlocks?: (
        context: AnalyzerContext,
        content: string,
    ) => Promise<CodeBlock[]>;
    extractFileRefs?: (
        context: AnalyzerContext,
        content: string,
    ) => FileRefDiscovery[] | Promise<FileRefDiscovery[]>;
    defaultLanguage: FileType | null;
};
