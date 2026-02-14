import { assertEquals } from "@std/assert";
import type { AnalyzerState } from "../../types.ts";
import { seedPermissionsFromFrontmatter } from "./seed-frontmatter.ts";

function createState(allowedTools?: string): AnalyzerState {
    return {
        skillId: "test",
        skillVersionId: "test",
        files: [],
        frontmatter: allowedTools ? { "allowed-tools": allowedTools, endLineNumer: 5 } : {},
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

Deno.test("seedPermissionsFromFrontmatter noops when allowed-tools missing", () => {
    const next = seedPermissionsFromFrontmatter(createState(), "SKILL.md");
    assertEquals(next.permissions.length, 0);
});

Deno.test("seedPermissionsFromFrontmatter maps known tools", () => {
    const next = seedPermissionsFromFrontmatter(createState("Bash Read"), "SKILL.md");
    const tools = next.permissions.map((p) => p.tool).sort();
    assertEquals(tools, ["bash", "read"]);
});

Deno.test("seedPermissionsFromFrontmatter parses args and unknown tool defaults", () => {
    const next = seedPermissionsFromFrontmatter(createState("Foo(arg1,arg2)"), "SKILL.md");
    assertEquals(next.permissions.length, 1);
    assertEquals(next.permissions[0].tool, "foo");
    assertEquals(next.permissions[0].scope, "sys");
    assertEquals(next.permissions[0].permission, "shell");
    assertEquals(next.permissions[0].args, ["arg1", "arg2"]);
});
