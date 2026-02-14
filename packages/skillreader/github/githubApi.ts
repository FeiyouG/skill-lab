import {
    AbstractGitHubSkillReader,
    type AbstractGitHubSkillReaderOptions,
    type GitHubTreeEntry,
} from "./base.ts";

export type GitHubApiSkillReaderOptions = AbstractGitHubSkillReaderOptions & {
    token: string;
};

export class GitHubApiSkillReader extends AbstractGitHubSkillReader {
    constructor(options: GitHubApiSkillReaderOptions) {
        super(options);
    }

    protected async readFileFromEntry(
        entry: GitHubTreeEntry,
    ): Promise<ReadableStream<Uint8Array> | null> {
        const blobResponse = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/git/blobs/${entry.sha}`,
            { headers: this.buildHeaders() },
        );
        if (!blobResponse.ok) return null;
        const blobData = await blobResponse.json() as { content?: string; encoding?: string };
        if (!blobData.content || blobData.encoding !== "base64") return null;
        const buffer = decodeBase64ToBuffer(blobData.content);
        return new Response(buffer).body;
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
