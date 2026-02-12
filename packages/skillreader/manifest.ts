import type {
    SkillFile,
    SkillFileManifest,
    SkillManifest,
    SkillZipManifest,
    ZipManifestFile,
} from "./types.ts";

export const SKILL_MANIFEST_VERSION = 1 as const;
export const SKILL_ZIP_MANIFEST_VERSION = 2 as const;

export function createSkillManifest(files: SkillFile[]): SkillFileManifest {
    return {
        version: SKILL_MANIFEST_VERSION,
        generatedAt: new Date().toISOString(),
        files,
    };
}

export function createZipManifest(
    files: ZipManifestFile[],
    metadata: {
        skillVersionId: string;
        repoUrl: string;
        commitHash: string;
        dir?: string | null;
        checksum: string;
        compression: "deflate" | "store";
    },
): SkillZipManifest {
    return {
        version: SKILL_ZIP_MANIFEST_VERSION,
        storage_method: "zip",
        compression: metadata.compression,
        skill_version_id: metadata.skillVersionId,
        repo_url: metadata.repoUrl,
        commit_hash: metadata.commitHash,
        dir: metadata.dir ?? null,
        created_at: new Date().toISOString(),
        checksum: metadata.checksum,
        files,
    };
}

export function parseSkillManifest(text: string): SkillManifest | null {
    try {
        const parsed = JSON.parse(text) as SkillManifest;
        if (!parsed || typeof parsed !== "object") return null;
        if (!Array.isArray((parsed as { files?: unknown }).files)) return null;
        if ((parsed as { version?: number }).version === SKILL_MANIFEST_VERSION) {
            return parsed as SkillFileManifest;
        }
        if ((parsed as { version?: number }).version === SKILL_ZIP_MANIFEST_VERSION) {
            const zipManifest = parsed as SkillZipManifest;
            if (zipManifest.storage_method !== "zip") return null;
            if (!zipManifest.compression) return null;
            return zipManifest;
        }
        return null;
    } catch {
        return null;
    }
}

export function isZipManifest(manifest: SkillManifest): manifest is SkillZipManifest {
    return (manifest as SkillZipManifest).storage_method === "zip";
}
