import { getFileType } from "skill-lab/shared";
import { parseSkillManifest } from "../manifest.ts";
import type { SkillFile } from "../types.ts";
import { SkillReader } from "../types.ts";
import { isProbablyText } from "../utils/mod.ts";

type LocalGitSkillReaderOptions = {
    repoRoot: string;
    gitRef: string;
    subDir?: string;
};

type GitEntry = {
    fullPath: string;
    relativePath: string;
};

export class LocalGitSkillReader extends SkillReader {
    private readonly repoRoot: string;
    private readonly gitRef: string;
    private readonly subDir: string;

    constructor(options: LocalGitSkillReaderOptions) {
        super();
        this.repoRoot = options.repoRoot;
        this.gitRef = options.gitRef;
        this.subDir = options.subDir?.replace(/^\/+|\/+$/g, "") ?? "";
    }

    async retrieveFiles(dir?: string): Promise<SkillFile[]> {
        const entries = await this.listEntries(dir);
        return entries.map((entry) => ({
            path: entry.relativePath,
            contentType: getFileType(entry.relativePath),
        }));
    }

    async readTextFile(path: string): Promise<string | null> {
        if (getFileType(path) === "binary") return null;
        const stream = await this.readFile(path);
        if (!stream) return null;
        const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
        if (!isProbablyText(bytes)) return null;
        return new TextDecoder().decode(bytes);
    }

    async readFile(path: string): Promise<ReadableStream<Uint8Array> | null> {
        const fullPath = this.joinWithSubDir(path);
        const result = await runGit(this.repoRoot, ["show", `${this.gitRef}:${fullPath}`]);
        if (result.code !== 0) return null;
        return new Response(result.stdout).body;
    }

    async readManifest() {
        try {
            const text = await this.readTextFile("manifest.json");
            if (!text) return null;
            return parseSkillManifest(text);
        } catch {
            return null;
        }
    }

    async validateRepositoryRef(): Promise<void> {
        const result = await runGit(this.repoRoot, ["rev-parse", "--verify", this.gitRef]);
        if (result.code !== 0) {
            throw new Error(`Git reference not found: ${this.gitRef}`);
        }
    }

    private async listEntries(dir?: string): Promise<GitEntry[]> {
        const scoped = this.joinWithSubDir(dir);
        const args = ["ls-tree", "-r", "--name-only", this.gitRef];
        if (scoped) {
            args.push("--", scoped);
        }
        const result = await runGit(this.repoRoot, args);
        if (result.code !== 0) {
            throw new Error(`Failed to list files for git reference: ${this.gitRef}`);
        }

        const files = new TextDecoder().decode(result.stdout)
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        const rootPrefix = this.joinWithSubDir(dir);
        return files
            .map((fullPath) => {
                const relativePath = rootPrefix
                    ? fullPath.startsWith(`${rootPrefix}/`)
                        ? fullPath.slice(rootPrefix.length + 1)
                        : ""
                    : fullPath;
                return { fullPath, relativePath };
            })
            .filter((entry) => entry.relativePath.length > 0);
    }

    private joinWithSubDir(path?: string): string {
        const cleaned = path?.replace(/^\/+|\/+$/g, "") ?? "";
        return [this.subDir, cleaned].filter(Boolean).join("/");
    }
}

async function runGit(repoRoot: string, args: string[]) {
    return await new Deno.Command("git", {
        args: ["-C", repoRoot, ...args],
        stdout: "piped",
        stderr: "piped",
    }).output();
}

export async function ensureGitRepoRoot(path: string): Promise<void> {
    const result = await runGit(path, ["rev-parse", "--show-toplevel"]);
    if (result.code !== 0) {
        throw new Error("Local path is not a git repository root");
    }

    const topLevel = new TextDecoder().decode(result.stdout).trim();
    const canonicalPath = await Deno.realPath(path);
    const canonicalTopLevel = await Deno.realPath(topLevel);
    if (canonicalPath !== canonicalTopLevel) {
        throw new Error(
            "When --gitRef is used with local sources, path must point to the git repository root",
        );
    }
}
