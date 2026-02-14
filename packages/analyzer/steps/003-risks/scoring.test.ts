import { assertEquals } from "@std/assert";
import type { AnalyzerState } from "../../types.ts";
import { scoreState } from "./scoring.ts";

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

Deno.test("scoreState returns safe when no risks and permissions", () => {
    const result = scoreState(createState());
    assertEquals(result.score, 0);
    assertEquals(result.riskLevel, "safe");
});

Deno.test("scoreState applies wildcard and uplifts", () => {
    const state = createState();
    state.permissions = [{
        id: "p1",
        tool: "curl",
        scope: "net",
        permission: "fetch",
        args: ["*"],
        references: [{ file: "a.sh", line: 1, type: "script" }],
        source: "detected",
        risks: [],
    }];
    state.risks = [{
        id: "r1",
        type: "NETWORK:data_exfiltration",
        severity: "warning",
        message: "post",
        reference: { file: "a.sh", line: 1, type: "script" },
        permissions: ["p1"],
        metadata: { method: "POST" },
    }];

    const result = scoreState(state);
    assertEquals(result.score >= 5, true);
    assertEquals(["attention", "risky", "avoid"].includes(result.riskLevel), true);
});
