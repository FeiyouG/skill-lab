import { SkillReader } from "../types.ts";
import { GitHubApiSkillReader } from "./githubApi.ts";
import { GitHubRawSkillReader } from "./githubRaw.ts";

export type GitHubSkillReaderOptions = {
    repoUrl: string;
    gitRef: string;
    dir?: string;
    token?: string;
};

export class GitHubSkillReader extends SkillReader {
    private reader: SkillReader;

    constructor(options: GitHubSkillReaderOptions) {
        super();
        if (options.token) {
            this.reader = new GitHubApiSkillReader({
                ...options,
                token: options.token,
            });
        } else {
            this.reader = new GitHubRawSkillReader(options);
        }
    }

    listFiles(dir?: string) {
        return this.reader.listFiles(dir);
    }

    readTextFile(path: string) {
        return this.reader.readTextFile(path);
    }

    readFile(path: string) {
        return this.reader.readFile(path);
    }

    readManifest() {
        return this.reader.readManifest();
    }
}

export { GitHubApiSkillReader } from "./githubApi.ts";
export { GitHubRawSkillReader } from "./githubRaw.ts";
