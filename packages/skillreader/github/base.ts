import { isProbablyText } from "../utils/mod.ts";
import type { SkillFile } from "../types.ts";
import { SkillReader } from "../types.ts";
import { parseSkillManifest } from "../manifest.ts";
import {
    buildGitHubHeaders,
    buildPrefix,
    normalizeRelativePath,
    parseGitHubRepo,
} from "./utils.ts";
import { getFileType } from "skill-lab/shared";

export type GitHubTreeEntry = {
    path: string;
    type: string;
    sha: string;
    size?: number;
};

export type AbstractGitHubSkillReaderOptions = {
    repoUrl: string;
    gitRef?: string;
    dir?: string;
    token?: string;
};

export abstract class AbstractGitHubSkillReader extends SkillReader {
    protected owner: string;
    protected repo: string;
    protected dir: string;
    protected token?: string;

    private requestedGitRef?: string;
    private resolvedGitRef?: string;
    private treeEntries: Map<string, GitHubTreeEntry> | null = null;

    constructor(options: AbstractGitHubSkillReaderOptions) {
        super();
        const parsed = parseGitHubRepo(options.repoUrl);
        if (!parsed) throw new Error("Unsupported repo URL");
        this.owner = parsed.owner;
        this.repo = parsed.repo;
        this.requestedGitRef = options.gitRef;
        this.dir = options.dir?.replace(/^\/+|\/+$/g, "") ?? "";
        this.token = options.token;
    }

    async retrieveFiles(dir?: string): Promise<SkillFile[]> {
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
                contentType: getFileType(relativePath),
            });
        }

        return files;
    }

    async readTextFile(path: string): Promise<string | null> {
        if (getFileType(path) === "binary") return null;
        const stream = await this.readFile(path);
        if (!stream) return null;
        const buffer = new Uint8Array(await new Response(stream).arrayBuffer());
        if (!isProbablyText(buffer)) return null;
        return new TextDecoder().decode(buffer);
    }

    async readFile(path: string): Promise<ReadableStream<Uint8Array> | null> {
        const entry = await this.findEntry(path);
        if (!entry) return null;
        return this.readFileFromEntry(entry);
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

    protected abstract readFileFromEntry(
        entry: GitHubTreeEntry,
    ): Promise<ReadableStream<Uint8Array> | null>;

    protected buildHeaders(): Record<string, string> {
        return buildGitHubHeaders(this.token);
    }

    protected async resolveGitRef(): Promise<string> {
        if (this.resolvedGitRef) return this.resolvedGitRef;
        if (this.requestedGitRef) {
            this.resolvedGitRef = this.requestedGitRef;
            return this.resolvedGitRef;
        }

        const response = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}`,
            { headers: this.buildHeaders() },
        );
        if (!response.ok) {
            throw new Error(`GitHub repository fetch failed: ${response.status}`);
        }
        const repoData = await response.json() as { default_branch?: string };
        if (!repoData.default_branch) {
            throw new Error("GitHub repository metadata missing default branch");
        }
        this.resolvedGitRef = repoData.default_branch;
        return this.resolvedGitRef;
    }

    protected async getTreeEntries(): Promise<Map<string, GitHubTreeEntry>> {
        if (this.treeEntries) return this.treeEntries;

        const gitRef = await this.resolveGitRef();
        const headers = this.buildHeaders();
        const commitResponse = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/commits/${gitRef}`,
            { headers },
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
            { headers },
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
