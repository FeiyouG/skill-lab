import { contentTypeFromPath, isProbablyText } from "../utils.ts";
import type { SkillFile } from "../types.ts";
import { SkillReader } from "../types.ts";
import { parseSkillManifest } from "../manifest.ts";
import {
    buildGitHubHeaders,
    buildPrefix,
    normalizeRelativePath,
    parseGitHubRepo,
} from "./utils.ts";

type GitHubTreeEntry = {
    path: string;
    type: string;
    sha: string;
    size?: number;
};

export type GitHubRawSkillReaderOptions = {
    repoUrl: string;
    gitRef: string;
    dir?: string;
};

export class GitHubRawSkillReader extends SkillReader {
    private owner: string;
    private repo: string;
    private commitHash: string;
    private dir: string;
    private treeEntries: Map<string, GitHubTreeEntry> | null = null;

    constructor(options: GitHubRawSkillReaderOptions) {
        super();
        const parsed = parseGitHubRepo(options.repoUrl);
        if (!parsed) throw new Error("Unsupported repo URL");
        this.owner = parsed.owner;
        this.repo = parsed.repo;
        this.commitHash = options.gitRef;
        this.dir = options.dir?.replace(/^\/+|\/+$/g, "") ?? "";
    }

    async listFiles(dir?: string): Promise<SkillFile[]> {
        const entries = await this.getTreeEntries();
        const prefix = buildPrefix(this.dir, dir);
        const files: SkillFile[] = [];

        for (const entry of entries.values()) {
            if (entry.type !== "blob") continue;
            if (prefix && !entry.path.startsWith(prefix)) continue;
            const relativePath = normalizeRelativePath(prefix, entry.path);
            if (!relativePath) continue;
            files.push({
                path: relativePath,
                size: entry.size,
                contentType: contentTypeFromPath(relativePath),
            });
        }

        return files;
    }

    async readTextFile(path: string): Promise<string | null> {
        if (contentTypeFromPath(path) === "binary") return null;
        const stream = await this.readFile(path);
        if (!stream) return null;
        const buffer = new Uint8Array(await new Response(stream).arrayBuffer());
        if (!isProbablyText(buffer)) return null;
        return new TextDecoder().decode(buffer);
    }

    async readFile(path: string): Promise<ReadableStream<Uint8Array> | null> {
        const entry = await this.findEntry(path);
        if (!entry) return null;
        const rawUrl =
            `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.commitHash}/${entry.path}`;
        const response = await fetch(rawUrl);
        if (!response.ok) return null;
        return response.body;
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

    private async getTreeEntries(): Promise<Map<string, GitHubTreeEntry>> {
        if (this.treeEntries) return this.treeEntries;

        const commitResponse = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/commits/${this.commitHash}`,
            { headers: buildGitHubHeaders() },
        );
        if (!commitResponse.ok) {
            throw new Error(`GitHub commit fetch failed: ${commitResponse.status}`);
        }
        const commitData = await commitResponse.json() as {
            commit?: { tree?: { sha?: string } };
        };
        const treeSha = commitData?.commit?.tree?.sha;
        if (!treeSha) throw new Error("Missing tree SHA");

        const treeResponse = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${treeSha}?recursive=1`,
            { headers: buildGitHubHeaders() },
        );
        if (!treeResponse.ok) {
            throw new Error(`GitHub tree fetch failed: ${treeResponse.status}`);
        }
        const treeData = await treeResponse.json() as { tree?: GitHubTreeEntry[] };
        const entries = new Map<string, GitHubTreeEntry>();
        for (const entry of treeData?.tree ?? []) {
            entries.set(entry.path, entry);
        }
        this.treeEntries = entries;
        return entries;
    }

    private async findEntry(path: string): Promise<GitHubTreeEntry | null> {
        const entries = await this.getTreeEntries();
        const fullPath = this.dir ? `${this.dir}/${path}` : path;
        return entries.get(fullPath) ?? null;
    }
}
