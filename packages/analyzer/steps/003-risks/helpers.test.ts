import { assertEquals } from "@std/assert";
import type { AnalyzerState } from "../../types.ts";
import { addRisk } from "./helpers.ts";

function createState(): AnalyzerState {
    return {
        skillId: "test",
        skillVersionId: "test",
        files: [],
        frontmatter: {},
        scanQueue: [],
        permissions: [{
            id: "p1",
            tool: "curl",
            scope: "net",
            permission: "fetch",
            args: ["https://a"],
            references: [{ file: "a.sh", line: 1, type: "script" }],
            source: "detected",
            risks: [],
        }],
        findings: [],
        risks: [],
        warnings: [],
        metadata: {
            scannedFiles: [],
            skippedFiles: [],
            rulesUsed: [],
            config: { maxFileSize: 1, maxFileCount: 1, maxScanDepth: 1 },
        },
    };
}

Deno.test("addRisk appends risk and links risk id to targeted permissions", () => {
    const state = createState();
    const next = addRisk(state, {
        type: "NETWORK:external_network_access",
        severity: "warning",
        message: "network",
        permissionIds: ["p1"],
        reference: { file: "a.sh", line: 1, type: "script" },
        metadata: { host: "example.com" },
    });

    assertEquals(next.risks.length, 1);
    assertEquals(next.permissions[0].risks.length, 1);
    assertEquals(next.risks[0].metadata?.host, "example.com");
});
