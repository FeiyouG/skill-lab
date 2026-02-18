import { assertStringIncludes } from "jsr:@std/assert@^1.0.0";
import type { AnalyzerResult } from "@FeiyouG/skill-lab-analyzer";
import { formatAnalyzeResult } from "./analyze-format.ts";

function baseResult(): AnalyzerResult {
    return {
        analyzedAt: "2026-02-18T00:00:00.000Z",
        skillId: "demo-skill",
        skillVersionId: "1.2.3",
        permissions: [],
        risks: [],
        score: 7,
        riskLevel: "caution",
        summary: "Basic summary",
        warnings: [],
        metadata: {
            scannedFiles: [],
            skippedFiles: [],
            rulesUsed: [],
            config: {
                maxFileSize: 1024,
                maxFileCount: 100,
                maxScanDepth: 2,
            },
        },
    };
}

Deno.test("formatAnalyzeResult renders empty sections with none", () => {
    const output = formatAnalyzeResult(baseResult());

    assertStringIncludes(output, "Analysis Results");
    assertStringIncludes(output, "  Skill: demo-skill@1.2.3");
    assertStringIncludes(output, "Permissions (0)\n  - none");
    assertStringIncludes(output, "Risks (0)\n  - none");
    assertStringIncludes(output, "Warnings (0)\n  - none");
});

Deno.test("formatAnalyzeResult renders permission risk and warning details", () => {
    const result = baseResult();
    result.permissions = [{
        id: "perm-1",
        tool: "read",
        scope: "fs",
        permission: "read",
        args: ["SKILL.md", "README.md"],
        references: [{ file: "SKILL.md", line: 12, type: "content" }],
        source: "detected",
        risks: [],
    }];
    result.risks = [{
        id: "risk-1",
        type: "NETWORK:external_network_access",
        severity: "warning",
        message: "Outbound network call found",
        reference: { file: "scripts/run.sh", line: 8, type: "script" },
        permissions: ["perm-1"],
    }];
    result.warnings = ["External reference not analyzed yet: https://example.com"];

    const output = formatAnalyzeResult(result);

    assertStringIncludes(output, "Permissions (1)");
    assertStringIncludes(output, "  - read.read [fs]");
    assertStringIncludes(output, "    args: SKILL.md, README.md");
    assertStringIncludes(output, "    source: detected");
    assertStringIncludes(output, "    ref: SKILL.md:12 (content)");

    assertStringIncludes(output, "Risks (1)");
    assertStringIncludes(output, "  - warning NETWORK:external_network_access");
    assertStringIncludes(output, "    message: Outbound network call found");
    assertStringIncludes(output, "    ref: scripts/run.sh:8 (script)");
    assertStringIncludes(output, "    permissions: perm-1");

    assertStringIncludes(output, "Warnings (1)");
    assertStringIncludes(output, "  - External reference not analyzed yet: https://example.com");
});
