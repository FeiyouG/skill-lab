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
import { TreesitterClient } from "./treesitter/client.ts";
import type { AnalyzerConfig, ScanConfig } from "./config.ts";
export type { AnalyzerConfig, ScanConfig };

export type AnalyzerLogger = {
    debug: (template: string, props?: Record<string, unknown>) => void;
    info: (template: string, props?: Record<string, unknown>) => void;
    warn: (template: string, props?: Record<string, unknown>) => void;
    error: (template: string, props?: Record<string, unknown>) => void;
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
        skippedFiles: Array<{ path: string; reason: string; referenceBy?: Reference }>;
        rulesUsed: string[];
        config: ScanConfig;
    };
};

export type AnalyzerContext = {
    skillReader: SkillReader;
    treesitterClient: TreesitterClient;
    astgrepClient: AstGrepClient;
    logger?: AnalyzerLogger;
    showProgressBar?: boolean;
    /** Resolved (defaults-merged) user config. */
    config: AnalyzerConfig;
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
