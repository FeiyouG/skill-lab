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

export type GitHubApiSkillReaderOptions = {
    repoUrl: string;
    gitRef: string;
    dir?: string;
    token: string;
};

export class GitHubApiSkillReader extends SkillReader {
    private owner: string;
    private repo: string;
    private commitHash: string;
    private dir: string;
    private token: string;
    private treeEntries: Map<string, GitHubTreeEntry> | null = null;

    constructor(options: GitHubApiSkillReaderOptions) {
        super();
        const parsed = parseGitHubRepo(options.repoUrl);
        if (!parsed) throw new Error("Unsupported repo URL");
        this.owner = parsed.owner;
        this.repo = parsed.repo;
        this.commitHash = options.gitRef;
        this.dir = options.dir?.replace(/^\/+|\/+$/g, "") ?? "";
        this.token = options.token;
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
        const entry = await this.findEntry(path);
        if (!entry) return null;
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
        const blobResponse = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/git/blobs/${entry.sha}`,
            { headers: buildGitHubHeaders(this.token) },
        );
        if (!blobResponse.ok) return null;
        const blobData = await blobResponse.json() as { content?: string; encoding?: string };
        if (!blobData.content || blobData.encoding !== "base64") return null;
        const buffer = decodeBase64ToBuffer(blobData.content);
        return new Response(buffer).body;
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

        const headers = buildGitHubHeaders(this.token);
        const tokenValue = this.token ?? "";
        const tokenHasWhitespace = tokenValue.trim() !== tokenValue;
        const tokenHasNewline = tokenValue.includes("\n") || tokenValue.includes("\r");
        const commitResponse = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/commits/${this.commitHash}`,
            { headers },
        );
        if (!commitResponse.ok) {
            const errorBody = await commitResponse.text();
            console.warn("GitHub commit fetch failed", {
                status: commitResponse.status,
                statusText: commitResponse.statusText,
                url: `https://api.github.com/repos/${this.owner}/${this.repo}/commits/${this.commitHash}`,
                headerKeys: Object.keys(headers),
                tokenLength: tokenValue.length,
                tokenHasWhitespace,
                tokenHasNewline,
                responseHeaders: Object.fromEntries(commitResponse.headers.entries()),
                body: errorBody.slice(0, 1000),
            });
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
            const errorBody = await treeResponse.text();
            console.warn("GitHub tree fetch failed", {
                status: treeResponse.status,
                statusText: treeResponse.statusText,
                url: `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${treeSha}?recursive=1`,
                headerKeys: Object.keys(headers),
                tokenLength: tokenValue.length,
                tokenHasWhitespace,
                tokenHasNewline,
                responseHeaders: Object.fromEntries(treeResponse.headers.entries()),
                body: errorBody.slice(0, 1000),
            });
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

function decodeBase64ToBuffer(input: string): ArrayBuffer {
    const cleaned = input.replace(/\n/g, "");
    const binary = atob(cleaned);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
}
