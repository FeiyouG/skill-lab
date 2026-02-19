import { assertEquals } from "@std/assert";
import type { AnalyzerState } from "../../types.ts";
import { synthesizePermissions } from "./synthesize.ts";

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
            config: { maxFileSize: 1, maxFileCount: 1, maxScanDepth: 1 },
        },
    };
}

Deno.test("synthesizePermissions merges by id and dedupes references/risks", () => {
    const state = createState();
    state.permissions = [
        {
            id: "p1",
            tool: "curl",
            scope: "net",
            permission: "fetch",
            args: ["https://a"],
            references: [{ file: "a.sh", line: 1, type: "script" }],
            source: "detected",
            risks: ["r1"],
        },
        {
            id: "p1",
            tool: "curl",
            scope: "net",
            permission: "fetch",
            args: ["https://a"],
            references: [{ file: "a.sh", line: 1, type: "script" }, {
                file: "a.sh",
                line: 2,
                type: "script",
            }],
            source: "detected",
            risks: ["r1", "r2"],
        },
    ];

    const next = synthesizePermissions(state);
    assertEquals(next.permissions.length, 1);
    assertEquals(next.permissions[0].references.length, 2);
    assertEquals(next.permissions[0].risks.sort(), ["r1", "r2"]);
});
