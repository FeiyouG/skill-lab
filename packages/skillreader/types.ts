import { parse as parseYaml } from "jsr:@std/yaml@^1.0.0";
import { extractFrontmatter } from "./frontmatter-parser.ts";

export type SkillContentType = "text" | "binary" | "unknown";

export type SkillFile = {
    path: string;
    size?: number;
    contentType: SkillContentType;
};

export type SkillFileManifest = {
    version: 1;
    generatedAt: string;
    files: SkillFile[];
};

export type ZipManifestFile = {
    path: string;
    size: number;
    offset: number;
    compressedSize: number;
    compressionMethod: number;
    signature: number;
};

export type SkillZipManifest = {
    version: 2;
    storage_method: "zip";
    compression: "deflate" | "store";
    skill_version_id: string;
    repo_url: string;
    commit_hash: string;
    dir: string | null;
    created_at: string;
    checksum: string;
    files: ZipManifestFile[];
};

export type SkillManifest = SkillFileManifest | SkillZipManifest;

export type SkillFrontmatter = {
    name: string;
    description: string;
    license?: string;
    compatibility?: string;
    metadata?: Record<string, unknown>;
    "allowed-tools"?: string;
    [key: string]: unknown;
};

export abstract class SkillReader {
    abstract listFiles(dir?: string): Promise<SkillFile[]>;
    abstract readTextFile(path: string): Promise<string | null>;
    abstract readFile(path: string): Promise<ReadableStream<Uint8Array> | null>;
    abstract readManifest(): Promise<SkillManifest | null>;

    public async getSkillMdPath(): Promise<string | null> {
        const files = await this.listFiles();
        const rootPath = files.find((file) => file.path.toLowerCase() === "skill.md");
        return rootPath?.path ?? null;
    }

    /**
     * Returns full SKILL.md content, or throws when the repository is not a valid skill.
     */
    public async getSkillMdContent(): Promise<string> {
        const skillMdPath = await this.getSkillMdPath();
        if (!skillMdPath) {
            throw new Error("Invalid skill repository: SKILL.md must exist at root");
        }
        const content = await this.readTextFile(skillMdPath);
        if (!content) {
            throw new Error("Invalid skill repository: SKILL.md is unreadable");
        }
        return content;
    }

    /**
     * Parses SKILL.md frontmatter and guarantees required fields.
     */
    public async getSkillMdFrontmatter(): Promise<SkillFrontmatter> {
        const content = await this.getSkillMdContent();
        const frontmatter = await extractFrontmatter(content);
        if (!frontmatter) {
            throw new Error("Invalid skill repository: SKILL.md missing YAML frontmatter");
        }
        let parsed: SkillFrontmatter;
        try {
            parsed = (parseYaml(frontmatter.content) as SkillFrontmatter) ??
                ({} as SkillFrontmatter);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Invalid skill repository: YAML frontmatter parse failed: ${message}`);
        }
        if (!parsed.name || !parsed.description) {
            throw new Error("Invalid skill repository: frontmatter requires name and description");
        }
        return parsed;
    }

    public async validate(): Promise<{ ok: boolean; reason?: string }> {
        try {
            await this.getSkillMdFrontmatter();
            return { ok: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { ok: false, reason: message };
        }
    }

    public async exists(): Promise<boolean> {
        const result = await this.validate();
        return result.ok;
    }
}
