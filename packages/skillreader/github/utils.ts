export type ParsedGitHubRepo = {
    owner: string;
    repo: string;
};

export function parseGitHubRepo(repoUrl: string): ParsedGitHubRepo | null {
    try {
        const parsed = new URL(repoUrl);
        if (!parsed.hostname.includes("github.com")) return null;
        const match = parsed.pathname.match(/^\/([^\/]+)\/([^\/]+?)(\.git)?$/);
        if (!match) return null;
        return { owner: match[1], repo: match[2] };
    } catch {
        return null;
    }
}

export function buildPrefix(baseDir?: string, extraDir?: string): string {
    const cleanedBase = baseDir?.replace(/^\/+|\/+$/g, "") ?? "";
    const cleanedExtra = extraDir?.replace(/^\/+|\/+$/g, "") ?? "";
    const combined = [cleanedBase, cleanedExtra].filter(Boolean).join("/");
    return combined ? `${combined}/` : "";
}

export function normalizeRelativePath(prefix: string, fullPath: string): string {
    if (!prefix) return fullPath;
    if (!fullPath.startsWith(prefix)) return "";
    return fullPath.slice(prefix.length);
}

export function buildGitHubHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "goskilla-api",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}
