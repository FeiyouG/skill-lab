import { assertEquals } from "@std/assert";
import type { AnalyzerState } from "../../types.ts";
import { run003Risks } from "./mod.ts";

function createInitialState(): AnalyzerState {
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
            config: {
                maxFileSize: 1_000_000,
                maxFileCount: 100,
                maxScanDepth: 2,
            },
        },
    };
}

Deno.test("run003Risks links destructive risk to matching permission reference only", () => {
    const state = createInitialState();
    state.permissions = [
        {
            id: "rm-permission",
            tool: "rm",
            scope: "fs",
            permission: "write",
            args: ["/tmp/old-data"],
            references: [{ file: "scripts/cleanup.sh", line: 3, type: "script" }],
            source: "detected",
            risks: [],
        },
        {
            id: "git-permission",
            tool: "git",
            scope: "sys",
            permission: "shell",
            args: ["status"],
            references: [{ file: "scripts/cleanup.sh", line: 10, type: "script" }],
            source: "detected",
            risks: [],
        },
    ];
    state.findings = [{
        ruleId: "fs-rm-rf",
        reference: { file: "scripts/cleanup.sh", line: 3, type: "script" },
        extracted: { path: "/tmp/old-data" },
    }];

    const result = run003Risks(state);

    assertEquals(result.risks.length, 1);
    assertEquals(result.risks[0].type, "DESTRUCTIVE:destructive_behavior");
    assertEquals(result.risks[0].permissions, ["rm-permission"]);

    const rmPermission = result.permissions.find((permission) => permission.id === "rm-permission");
    const gitPermission = result.permissions.find((permission) =>
        permission.id === "git-permission"
    );
    assertEquals((rmPermission?.risks.length ?? 0) > 0, true);
    assertEquals(gitPermission?.risks.length ?? 0, 0);
});
