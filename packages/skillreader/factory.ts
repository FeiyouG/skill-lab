import { join } from "jsr:@std/path@^1.0.0";
import { LocalFsSkillReader } from "./fs/mod.ts";
import { ensureGitRepoRoot, LocalGitSkillReader } from "./fs/git.ts";
import { GitHubSkillReader } from "./github/mod.ts";
import { parseGitHubRepo } from "./github/utils.ts";
import type { SkillReader } from "./types.ts";

export type SkillReaderFactoryOptions = {
    source: string;
    subDir?: string;
    gitRef?: string;
    githubToken?: string;
};

export class SkillReaderFactory {
    static async create(options: SkillReaderFactoryOptions): Promise<SkillReader> {
        const source = options.source.trim();
        if (!source) {
            throw new Error("Source is required");
        }

        const githubParsed = parseGitHubRepo(source);
        if (githubParsed) {
            return new GitHubSkillReader({
                repoUrl: source,
                gitRef: options.gitRef,
                dir: options.subDir,
                token: options.githubToken ?? Deno.env.get("GITHUB_TOKEN") ?? undefined,
            });
        }

        if (isHttpUrl(source)) {
            throw new Error(
                "Invalid source: URL must be a GitHub repository URL or a local directory path",
            );
        }

        const rootPath = options.subDir ? join(source, options.subDir) : source;
        if (options.gitRef) {
            await ensureDirectory(source);
            await ensureGitRepoRoot(source);
            const reader = new LocalGitSkillReader({
                repoRoot: source,
                gitRef: options.gitRef,
                subDir: options.subDir,
            });
            await reader.validateRepositoryRef();
            return reader;
        }

        await ensureDirectory(rootPath);
        return new LocalFsSkillReader({ root: rootPath });
    }
}

function isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

async function ensureDirectory(path: string): Promise<void> {
    try {
        const stat = await Deno.stat(path);
        if (!stat.isDirectory) {
            throw new Error("Path must be a directory");
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Local path not found: ${message}`);
    }
}
