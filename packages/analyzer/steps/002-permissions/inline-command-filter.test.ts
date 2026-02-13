import { assertEquals } from "@std/assert";
import type { SkillFile, SkillManifest } from "@FeiyouG/skill-lab";
import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import { run002Permissions } from "./mod.ts";

function createSkillReader(contentByPath: Record<string, string>): AnalyzerContext["skillReader"] {
    return {
        listFiles(_dir?: string): Promise<SkillFile[]> {
            return Promise.resolve(
                Object.keys(contentByPath).map((path) => ({
                    path,
                    contentType: "text",
                    size: contentByPath[path].length,
                })),
            );
        },
        readTextFile(path: string): Promise<string | null> {
            return Promise.resolve(contentByPath[path] ?? null);
        },
        readFile(path: string): Promise<ReadableStream<Uint8Array> | null> {
            const content = contentByPath[path];
            if (!content) return Promise.resolve(null);
            const bytes = new TextEncoder().encode(content);
            return Promise.resolve(
                new ReadableStream<Uint8Array>({
                    start(controller) {
                        controller.enqueue(bytes);
                        controller.close();
                    },
                }),
            );
        },
        readManifest(): Promise<SkillManifest | null> {
            return Promise.resolve(null);
        },
    } as unknown as AnalyzerContext["skillReader"];
}

function createBaseState(content: string): AnalyzerState {
    return {
        skillId: "test",
        skillVersionId: "test",
        files: [{ path: "SKILL.md", contentType: "text", size: content.length }],
        frontmatter: { name: "test", description: "test" },
        scanQueue: [{
            path: "SKILL.md",
            sourceType: "local",
            fileType: "markdown",
            role: "entrypoint",
            depth: 0,
        }],
        permissions: [],
        findings: [],
        risks: [],
        warnings: [],
        metadata: {
            scannedFiles: [],
            skippedFiles: [],
            rulesUsed: [],
            config: {
                maxFileSize: 1_000_000,
                maxFileCount: 100,
                maxScanDepth: 2,
            },
        },
    };
}

Deno.test("run002Permissions ignores prose inline tokens as bash commands", async () => {
    const line =
        "- **Frontmatter** (YAML): Contains `name` and `description` fields (required), plus optional fields like `license`, `metadata`, and `compatibility`.";
    const state = createBaseState(line);
    state.scanQueue.push({
        path: "SKILL.md:1-1",
        sourceType: "local",
        fileType: "bash",
        role: "script",
        depth: 1,
        discoveryMethod: "code-block",
        referencedBy: {
            file: "SKILL.md",
            line: 1,
            lineEnd: 1,
            type: "inline",
        },
    });

    const next = await run002Permissions(state, {
        skillReader: createSkillReader({ "SKILL.md": line }),
    });

    const bashLike = next.permissions.filter((permission) =>
        permission.scope === "sys" || permission.tool === "source"
    );
    assertEquals(bashLike.length, 0);
});

Deno.test("run002Permissions keeps true inline command detection", async () => {
    const line = "Run `git status` to inspect repository state.";
    const state = createBaseState(line);
    state.scanQueue.push({
        path: "SKILL.md:1-1",
        sourceType: "local",
        fileType: "bash",
        role: "script",
        depth: 1,
        discoveryMethod: "code-block",
        referencedBy: {
            file: "SKILL.md",
            line: 1,
            lineEnd: 1,
            type: "inline",
        },
    });

    const next = await run002Permissions(state, {
        skillReader: createSkillReader({ "SKILL.md": line }),
    });

    const gitPermissions = next.permissions.filter((permission) => permission.tool === "git");
    assertEquals(gitPermissions.length > 0, true);
});
