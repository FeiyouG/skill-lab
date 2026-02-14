import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { GitHubRawSkillReader } from "./githubRaw.ts";

Deno.test("GitHubRawSkillReader uses repository default branch when gitRef omitted", async () => {
    const calls: string[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = ((input: string | URL | Request) => {
        const url = typeof input === "string"
            ? input
            : input instanceof URL
            ? input.href
            : input.url;
        calls.push(url);

        if (url.endsWith("/repos/acme/widgets")) {
            return Promise.resolve(jsonResponse({ default_branch: "main" }));
        }
        if (url.endsWith("/repos/acme/widgets/commits/main")) {
            return Promise.resolve(jsonResponse({ commit: { tree: { sha: "tree123" } } }));
        }
        if (url.endsWith("/repos/acme/widgets/git/trees/tree123?recursive=1")) {
            return Promise.resolve(jsonResponse({
                tree: [{ path: "SKILL.md", type: "blob", sha: "blob1", size: 10 }],
            }));
        }
        return Promise.resolve(new Response("not found", { status: 404 }));
    }) as typeof fetch;

    try {
        const reader = new GitHubRawSkillReader({ repoUrl: "https://github.com/acme/widgets" });
        const files = await reader.retrieveFiles();
        assertEquals(files.length, 1);
        assertEquals(files[0].path, "SKILL.md");
        assertEquals(calls.some((url) => url.endsWith("/repos/acme/widgets")), true);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

Deno.test("GitHubRawSkillReader does not fetch repository metadata when gitRef is provided", async () => {
    const calls: string[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = ((input: string | URL | Request) => {
        const url = typeof input === "string"
            ? input
            : input instanceof URL
            ? input.href
            : input.url;
        calls.push(url);

        if (url.endsWith("/repos/acme/widgets/commits/release")) {
            return Promise.resolve(jsonResponse({ commit: { tree: { sha: "tree123" } } }));
        }
        if (url.endsWith("/repos/acme/widgets/git/trees/tree123?recursive=1")) {
            return Promise.resolve(jsonResponse({
                tree: [{ path: "SKILL.md", type: "blob", sha: "blob1", size: 10 }],
            }));
        }
        return Promise.resolve(new Response("not found", { status: 404 }));
    }) as typeof fetch;

    try {
        const reader = new GitHubRawSkillReader({
            repoUrl: "https://github.com/acme/widgets",
            gitRef: "release",
        });
        const files = await reader.retrieveFiles();
        assertEquals(files.length, 1);
        assertEquals(calls.some((url) => url.endsWith("/repos/acme/widgets")), false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
    });
}
