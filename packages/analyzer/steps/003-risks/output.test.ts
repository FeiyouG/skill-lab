import { assertEquals } from "@std/assert";
import type { AnalyzerState } from "../../types.ts";
import { toAnalyzerResult } from "./output.ts";

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
            scannedFiles: ["a"],
            skippedFiles: [{ path: "x", reason: "external_reference" }],
            rulesUsed: ["r"],
            config: { maxFileSize: 1, maxFileCount: 1, maxScanDepth: 1 },
        },
    };
}

Deno.test("toAnalyzerResult maps state and produces timestamp", () => {
    const result = toAnalyzerResult(createState());
    assertEquals(result.skillId, "skill-a");
    assertEquals(result.skillVersionId, "1.2.3");
    assertEquals(result.warnings, ["w1"]);
    assertEquals(typeof result.analyzedAt, "string");
    assertEquals(result.analyzedAt.includes("T"), true);
});
