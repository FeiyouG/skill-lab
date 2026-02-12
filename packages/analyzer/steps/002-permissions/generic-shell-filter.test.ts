import { assertEquals } from "@std/assert";
import type { AnalyzerState } from "../../types.ts";
import { scanFileForPermissions } from "./scan-file.ts";

function createInitialState(): AnalyzerState {
    return {
        version: "test",
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

Deno.test("scanFileForPermissions keeps generic shell matches to likely commands", async () => {
    const content = [
        "# rm -rf /tmp/old-data",
        "Set variable before running cleanup.",
        "PATH=/tmp/cache",
        "echo hello",
        "Run tests with npm test.",
    ].join("\n");

    const state = createInitialState();
    const next = await scanFileForPermissions({
        state,
        fileRef: {
            path: "scripts/demo.sh",
            sourceType: "local",
            fileType: "bash",
            role: "script",
            depth: 0,
        },
        scanPath: "scripts/demo.sh",
        content,
    });

    const genericFindings = next.findings.filter((finding) =>
        finding.ruleId === "shell-generic-command"
    );
    const extractedTools = genericFindings.map((finding) => String(finding.extracted.tool ?? ""));

    assertEquals(extractedTools.includes("set"), false);
    assertEquals(extractedTools.includes("path"), false);
    assertEquals(extractedTools.includes("run"), false);

    const forbiddenGenericPermissions = next.permissions.filter((permission) =>
        permission.tool === "set" || permission.tool === "path" || permission.tool === "run"
    );
    assertEquals(forbiddenGenericPermissions.length, 0);
});
