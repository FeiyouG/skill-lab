/**
 * Skill-related types for the goskilla registry.
 */

/**
 * Skill status in the registry.
 */
export type SkillStatus = "active" | "deprecated" | "removed";

/**
 * Supported repository types.
 */
export type RepoType = "github"; // future: "gitlab", "bitbucket", etc.

/**
 * Core skill entity.
 */
export interface Skill {
    /** Unique identifier (UUID) */
    id: string;
    /** Skill name (slug, unique) - used in URLs and CLI */
    name: string;
    /** Download URL for SKILL.md of the selected version */
    downloadUrl?: string;
    /** Human-readable display name */
    displayName?: string;
    /** Brief description */
    description: string;
    /** Author ID (user who created the skill) */
    authorId: string;
    /** Repository type */
    repoType: RepoType;
    /** License identifier */
    license?: string;
    /** Skill status */
    status: SkillStatus;
    /** Search keywords (joined from skill_keywords table) */
    keywords?: string[];
    /** Submitter-provided keywords (version-level) */
    submitterKeywords?: string[];
    /** Analyzer-derived keywords (analysis-level) */
    analysisKeywords?: string[];
    /** Creation timestamp */
    createdAt: string;
    /** Last update timestamp */
    updatedAt: string;
    /** Latest version (joined) */
    latestVersion?: SkillVersion;
    /** Author profile (joined) */
    author?: {
        githubUsername: string;
        displayName?: string;
        avatarUrl?: string;
    };
}

/**
 * Skill version entity (pinned to specific commit).
 */
export interface SkillVersion {
    /** Version ID (UUID) */
    id: string;
    /** Parent skill ID */
    skillId: string;
    /** Semantic version string */
    version: string;
    /** Repository URL at submission time */
    repoUrl: string;
    /** Pinned commit SHA */
    commitHash: string;
    /** Tag name (optional) */
    tag?: string;
    /** Directory containing SKILL.md */
    dir?: string;
    /** SHA256 hash of SKILL.md content */
    contentHash?: string;
    /** User who submitted this version (null if system-parsed) */
    submittedBy?: string;
    /** Publication timestamp */
    createdAt: string;
}

/**
 * Input for creating a new skill.
 */
export interface CreateSkillInput {
    /** Skill name/slug (must be unique, lowercase, hyphen-separated) */
    name: string;
    /** Display name */
    displayName?: string;
    /** Description */
    description: string;
    /** Repository URL */
    repoUrl: string;
    /** Repository type */
    repoType?: RepoType;
    /** Initial version (semver) */
    version: string;
    /** Commit hash to pin to */
    commitHash: string;
    /** Tag name (optional) */
    tag?: string;
    /** Directory containing SKILL.md */
    dir?: string;
    /** Keywords for search */
    keywords?: string[];
    /** License identifier */
    license?: string;
}

/**
 * Input for updating skill metadata.
 */
export interface UpdateSkillInput {
    /** Updated display name */
    displayName?: string;
    /** Updated description */
    description?: string;
    /** Updated keywords */
    keywords?: string[];
    /** Updated license */
    license?: string;
}

/**
 * Input for publishing a new version.
 */
export interface PublishVersionInput {
    /** Semantic version (must be greater than previous) */
    version: string;
    /** Repository URL (can change between versions) */
    repoUrl: string;
    /** Commit hash to pin to */
    commitHash: string;
}
