import { assertEquals } from "@std/assert";
import type { SkillFile, SkillManifest } from "@FeiyouG/skill-lab";
import { AstGrepClient } from "../../astgrep/client.ts";
import { TreesitterClient } from "../../treesitter/client.ts";
import { DEFAULT_ANALYZER_CONFIG } from "../../config.ts";
import type { AnalyzerConfig } from "../../config.ts";
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
            scannedFiles: new Set<string>(),
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

function createContext(
    contentByPath: Record<string, string>,
    config: AnalyzerConfig = DEFAULT_ANALYZER_CONFIG,
): AnalyzerContext {
    return {
        skillReader: createSkillReader(contentByPath),
        treesitterClient: new TreesitterClient(),
        astgrepClient: new AstGrepClient(),
        config,
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

Deno.test("run002Permissions adds dep permission for external markdown links", async () => {
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
    const depPerms = next.permissions.filter((p) =>
        p.scope === "dep" && p.permission === "externalreference"
    );
    assertEquals(depPerms.length, 1);
    assertEquals(depPerms[0].tool, "unknown");
    assertEquals(depPerms[0].args?.includes("https://example.com/file.md"), true);
    assertEquals(next.metadata.skippedFiles.some((s) => s.reason === "external_reference"), true);
});

Deno.test("run002Permissions adds dep import permission", async () => {
    const state = createBaseState();
    state.scanQueue.push({
        path: "requests",
        sourceType: "external",
        fileType: "python",
        role: "library",
        depth: 1,
        discoveryMethod: "import",
        referencedBy: {
            file: "scripts/main.py",
            line: 1,
            type: "content",
        },
    });

    const next = await run002Permissions(
        state,
        createContext({ "SKILL.md": "# Skill" }),
    );

    const depPerms = next.permissions.filter((p) => p.scope === "dep" && p.permission === "import");
    assertEquals(depPerms.length, 1);
    assertEquals(depPerms[0].tool, "python");
    assertEquals(depPerms[0].args?.includes("requests"), true);
    assertEquals(
        next.metadata.skippedFiles.some((s) => s.reason === "external_library_dependency"),
        true,
    );
});

Deno.test("run002Permissions adds dep import permission regardless of allowlist", async () => {
    const state = createBaseState();
    state.scanQueue.push({
        path: "requests",
        sourceType: "external",
        fileType: "python",
        role: "library",
        depth: 1,
        discoveryMethod: "import",
        referencedBy: {
            file: "scripts/main.py",
            line: 1,
            type: "content",
        },
    });

    const next = await run002Permissions(
        state,
        createContext(
            { "SKILL.md": "# Skill" },
            {
                ...DEFAULT_ANALYZER_CONFIG,
                allowlist: { languages: { python: { imports: ["requests"] } } },
            },
        ),
    );

    const depPerms = next.permissions.filter((p) => p.scope === "dep" && p.permission === "import");
    assertEquals(depPerms.length, 1);
    assertEquals(
        next.metadata.skippedFiles.some((s) => s.reason === "external_library_dependency"),
        true,
    );
});

Deno.test("run002Permissions adds one dep import permission per import", async () => {
    const state = createBaseState();
    state.scanQueue.push(
        {
            path: "core.gif_builder",
            sourceType: "external",
            fileType: "python",
            role: "library",
            depth: 1,
            discoveryMethod: "import",
            referencedBy: { file: "SKILL.md", line: 24, type: "script" },
        },
        {
            path: "core.validators",
            sourceType: "external",
            fileType: "python",
            role: "library",
            depth: 1,
            discoveryMethod: "import",
            referencedBy: { file: "SKILL.md", line: 124, type: "script" },
        },
    );

    const next = await run002Permissions(state, createContext({ "SKILL.md": "# Skill" }));
    const importPerms = next.permissions.filter((permission) =>
        permission.scope === "dep" && permission.permission === "import"
    );

    assertEquals(importPerms.length, 2);
    assertEquals(importPerms.some((p) => p.args?.includes("core.gif_builder")), true);
    assertEquals(importPerms.some((p) => p.args?.includes("core.validators")), true);
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
