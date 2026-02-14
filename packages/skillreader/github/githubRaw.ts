import {
    AbstractGitHubSkillReader,
    type AbstractGitHubSkillReaderOptions,
    type GitHubTreeEntry,
} from "./base.ts";

export type GitHubRawSkillReaderOptions = AbstractGitHubSkillReaderOptions;

export class GitHubRawSkillReader extends AbstractGitHubSkillReader {
    constructor(options: GitHubRawSkillReaderOptions) {
        super(options);
    }

    protected async readFileFromEntry(
        entry: GitHubTreeEntry,
    ): Promise<ReadableStream<Uint8Array> | null> {
        const gitRef = await this.resolveGitRef();
        const rawUrl =
            `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${gitRef}/${entry.path}`;
        const response = await fetch(rawUrl);
        if (!response.ok) return null;
        return response.body;
    }
}
