import { assertEquals } from "@std/assert";
import type { AnalyzerState } from "../../types.ts";
import { SkillAnalyzerResult } from "../../result.ts";

function createState(): AnalyzerState {
    return {
        skillId: "skill-a",
        skillVersionId: "1.2.3",
        files: [],
        frontmatter: {},
        scanQueue: [],
        permissions: [],
        findings: [],
        risks: [],
        warnings: ["w1"],
        metadata: {
            scannedFiles: new Set(["a"]),
            skippedFiles: [{ path: "x", reason: "external_reference" }],
            rulesUsed: ["r"],
            config: { maxFileSize: 1, maxFileCount: 1, maxScanDepth: 1 },
        },
    };
}

Deno.test("SkillAnalyzerResult exposes state fields and produces timestamp", () => {
    const result = new SkillAnalyzerResult(createState());
    assertEquals(result.skillId, "skill-a");
    assertEquals(result.skillVersionId, "1.2.3");
    assertEquals(result.warnings, ["w1"]);
    assertEquals(typeof result.analyzedAt, "string");
    assertEquals(result.analyzedAt.includes("T"), true);
});

Deno.test("SkillAnalyzerResult computes safe risk level for empty risks", () => {
    const result = new SkillAnalyzerResult(createState());
    assertEquals(result.riskLevel, "safe");
    assertEquals(result.score, 0);
});
