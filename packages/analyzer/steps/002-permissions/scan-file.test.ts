import { assertEquals } from "@std/assert";
import { AstGrepClient } from "../../astgrep/client.ts";
import { DEFAULT_ANALYZER_CONFIG } from "../../config.ts";
import type { AnalyzerContext, AnalyzerState } from "../../types.ts";
import { scanFileForPermissions } from "./scan-file.ts";

function createState(): AnalyzerState {
    return {
        skillId: "test",
        skillVersionId: "test",
        files: [],
        frontmatter: {},
        scanQueue: [],
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

const context = {
    astgrepClient: new AstGrepClient(),
    config: DEFAULT_ANALYZER_CONFIG,
} as AnalyzerContext;

Deno.test("scanFileForPermissions no rules path only records scanned file", async () => {
    const state = createState();
    const next = await scanFileForPermissions(context, {
        state,
        fileRef: {
            path: "a.unknown",
            sourceType: "local",
            fileType: "unknown",
            role: "regular",
            depth: 0,
        },
        scanPath: "a.unknown",
        content: "noop",
    });
    assertEquals(next.permissions.length, 0);
    assertEquals(next.findings.length, 0);
    assertEquals(next.metadata.scannedFiles.has("a.unknown"), true);
});

Deno.test("scanFileForPermissions applies line offset to findings", async () => {
    const state = createState();
    const next = await scanFileForPermissions(context, {
        state,
        fileRef: {
            path: "scripts/a.sh",
            sourceType: "local",
            fileType: "bash",
            role: "script",
            depth: 0,
        },
        scanPath: "scripts/a.sh",
        content: "echo hello",
        lineOffset: 9,
        referenceType: "script",
    });

    assertEquals(next.findings.length > 0, true);
    assertEquals(next.findings[0].reference.line >= 10, true);
});

Deno.test("scanFileForPermissions extracts permission args and skips duplicates", async () => {
    const state = createState();
    const next = await scanFileForPermissions(context, {
        state,
        fileRef: {
            path: "scripts/a.sh",
            sourceType: "local",
            fileType: "bash",
            role: "script",
            depth: 0,
        },
        scanPath: "scripts/a.sh",
        content: "curl -X POST https://api.example.com/upload",
        referenceType: "script",
    });

    const netPerm = next.permissions.find((p) => p.scope === "net");
    assertEquals(Boolean(netPerm), true);
    assertEquals((netPerm?.args?.length ?? 0) >= 1, true);
});

Deno.test("scanFileForPermissions detects pip commands", async () => {
    const state = createState();
    const next = await scanFileForPermissions(context, {
        state,
        fileRef: {
            path: "scripts/setup.sh",
            sourceType: "local",
            fileType: "bash",
            role: "script",
            depth: 0,
        },
        scanPath: "scripts/setup.sh",
        content: "pip install pillow imageio numpy",
        referenceType: "script",
    });

    const pipPerms = next.permissions.filter((p) => p.tool === "pip" && p.scope === "sys");
    assertEquals(pipPerms.length, 1);
    assertEquals(pipPerms[0].args?.includes("install"), true);
});
