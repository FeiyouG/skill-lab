import { assertEquals } from "@std/assert";
import { DEFAULT_ANALYZER_CONFIG } from "../../config/mod.ts";
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
            scannedFiles: new Set<string>(),
            skippedFiles: [],
            rulesUsed: [],
            config: { maxFileSize: 1, maxFileCount: 1, maxScanDepth: 1 },
        },
    };
}

Deno.test("scoreState returns safe when no risks and permissions", () => {
    const result = scoreState(createState(), DEFAULT_ANALYZER_CONFIG);
    assertEquals(result.score, 0);
    assertEquals(result.riskLevel, "safe");
});

Deno.test("scoreState applies configured uplift and ignores permission count", () => {
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

    const result = scoreState(state, DEFAULT_ANALYZER_CONFIG);
    assertEquals(result.score, 6);
    assertEquals(result.riskLevel, "risky");
});

Deno.test("scoreState uses custom riskReport thresholds and baseScore", () => {
    const state = createState();
    state.risks = [{
        id: "r1",
        type: "NETWORK:external_network_access",
        severity: "warning",
        message: "warning",
        reference: { file: "a.sh", line: 1, type: "script" },
        permissions: [],
    }];

    const result = scoreState(state, {
        ...DEFAULT_ANALYZER_CONFIG,
        riskReport: {
            baseScore: {
                info: 0,
                warning: 4,
                critical: 8,
            },
            thresholds: {
                safe: 0,
                caution: 1,
                attention: 4,
                risky: 6,
                avoid: 9,
            },
        },
    });

    assertEquals(result.score, 4);
    assertEquals(result.riskLevel, "attention");
});
