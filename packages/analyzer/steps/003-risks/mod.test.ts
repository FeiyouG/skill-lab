import { assertEquals } from "@std/assert";
import type { AnalyzerState } from "../../types.ts";
import { run003Risks } from "./mod.ts";

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
            scannedFiles: [],
            skippedFiles: [],
            rulesUsed: [],
            config: { maxFileSize: 1, maxFileCount: 1, maxScanDepth: 1 },
        },
    };
}

Deno.test("run003Risks adds remote script warning for RCE risk", async () => {
    const state = createState();
    state.permissions = [{
        id: "sys-shell",
        tool: "bash",
        scope: "sys",
        permission: "shell",
        args: ["curl"],
        references: [{ file: "script.sh", line: 1, type: "script" }],
        source: "detected",
        risks: [],
    }];
    state.findings = [{
        ruleId: "net-pipe-shell",
        reference: { file: "script.sh", line: 1, type: "script" },
        extracted: { command: "https://x.sh" },
    }];

    const result = await run003Risks(state);
    assertEquals(
        result.warnings.includes("Remote script content analysis is NOT_IMPLEMENTED"),
        true,
    );
});
