import { assertEquals } from "@std/assert";
import type { SkillFile, SkillManifest } from "@FeiyouG/skill-lab";
import { AstGrepClient } from "../../astgrep/client.ts";
import { TreesitterClient } from "../../treesiter/client.ts";
import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import { run002Permissions } from "./mod.ts";

function createSkillReader(contentByPath: Record<string, string>): AnalyzerContext["skillReader"] {
    return {
        listFiles(_dir?: string): Promise<SkillFile[]> {
            return Promise.resolve(
                Object.entries(contentByPath).map(([path, content]) => ({
                    path,
                    contentType: "text",
                    size: content.length,
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

function createBaseState(): AnalyzerState {
    return {
        skillId: "test",
        skillVersionId: "test",
        files: [{ path: "SKILL.md", contentType: "text", size: 10 }],
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

function createContext(contentByPath: Record<string, string>): AnalyzerContext {
    return {
        skillReader: createSkillReader(contentByPath),
        treesitterClient: new TreesitterClient(),
        astgrepClient: new AstGrepClient(),
    };
}

Deno.test("run002Permissions adds inferred host-fs permission only once", async () => {
    const state = createBaseState();
    state.scanQueue.push(
        {
            path: "~/secret.txt",
            sourceType: "external",
            fileType: "unknown",
            role: "host-fs",
            depth: 1,
        },
        {
            path: "~/secret.txt",
            sourceType: "external",
            fileType: "unknown",
            role: "host-fs",
            depth: 1,
        },
    );

    const next = await run002Permissions(state, createContext({ "SKILL.md": "# Skill" }));
    const hostPerms = next.permissions.filter((p) => p.scope === "fs" && p.tool === "read");
    assertEquals(hostPerms.length, 1);
    assertEquals(hostPerms[0].args?.includes("~/secret.txt"), true);
});

Deno.test("run002Permissions warns for external markdown links", async () => {
    const state = createBaseState();
    state.scanQueue.push({
        path: "https://example.com/file.md",
        sourceType: "external",
        fileType: "unknown",
        role: "regular",
        depth: 1,
        discoveryMethod: "markdown-link",
    });

    const next = await run002Permissions(state, createContext({ "SKILL.md": "# Skill" }));
    assertEquals(
        next.warnings.some((w) => w.includes("External reference not analyzed yet")),
        true,
    );
    assertEquals(next.metadata.skippedFiles.some((s) => s.reason === "external_reference"), true);
});

Deno.test("run002Permissions warns for unsupported local file types", async () => {
    const state = createBaseState();
    state.scanQueue.push({
        path: "asset.bin",
        sourceType: "local",
        fileType: "unknown",
        role: "regular",
        depth: 1,
    });

    const next = await run002Permissions(
        state,
        createContext({ "SKILL.md": "# Skill", "asset.bin": "x" }),
    );
    assertEquals(next.warnings.some((w) => w.includes("not supported yet for analysis")), true);
    assertEquals(
        next.metadata.skippedFiles.some((s) => s.reason === "unsupported_type_unknown"),
        true,
    );
});
