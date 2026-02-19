import { assertEquals } from "@std/assert";
import { DEFAULT_ANALYZER_CONFIG } from "../../config/mod.ts";
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
            scannedFiles: new Set<string>(),
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

Deno.test("run003Risks resolves denied dep import to critical risk", async () => {
    const state = createInitialState();
    state.permissions.push({
        id: "dep-import-python-requests",
        tool: "python",
        scope: "dep",
        permission: "import",
        args: ["requests"],
        metadata: { language: "python", discoveryMethod: "import" },
        references: [{ file: "SKILL.md", line: 24, type: "script" }],
        source: "inferred",
        risks: [],
    });

    const result = await run003Risks(state, {
        config: {
            ...DEFAULT_ANALYZER_CONFIG,
            denylist: { languages: { python: { imports: ["requests"] } } },
        },
    });

    assertEquals(result.risks.length, 1);
    assertEquals(result.risks[0].type, "DEPENDENCY:external_import");
    assertEquals(result.risks[0].severity, "critical");
    assertEquals(result.risks[0].groupKey, "DEPENDENCY:external_import:python");
});

Deno.test("run003Risks skips allowlisted dep import risk", async () => {
    const state = createInitialState();
    state.permissions.push({
        id: "dep-import-python-requests",
        tool: "python",
        scope: "dep",
        permission: "import",
        args: ["requests"],
        metadata: { language: "python", discoveryMethod: "import" },
        references: [{ file: "SKILL.md", line: 24, type: "script" }],
        source: "inferred",
        risks: [],
    });

    const result = await run003Risks(state, {
        config: {
            ...DEFAULT_ANALYZER_CONFIG,
            allowlist: { languages: { python: { imports: ["requests"] } } },
        },
    });

    assertEquals(result.risks.length, 0);
});

Deno.test("run003Risks skips dependency risks for default builtin imports", async () => {
    const state = createInitialState();
    state.permissions.push(
        {
            id: "dep-import-python-os",
            tool: "python",
            scope: "dep",
            permission: "import",
            args: ["os"],
            metadata: { language: "python", discoveryMethod: "import" },
            references: [{ file: "SKILL.md", line: 10, type: "script" }],
            source: "inferred",
            risks: [],
        },
        {
            id: "dep-import-typescript-fs",
            tool: "typescript",
            scope: "dep",
            permission: "import",
            args: ["fs"],
            metadata: { language: "typescript", discoveryMethod: "import" },
            references: [{ file: "SKILL.md", line: 20, type: "script" }],
            source: "inferred",
            risks: [],
        },
    );

    const result = await run003Risks(state, { config: DEFAULT_ANALYZER_CONFIG });

    assertEquals(result.risks.length, 0);
});

Deno.test("run003Risks assigns one group key per language for import risks", async () => {
    const state = createInitialState();
    state.permissions.push(
        {
            id: "dep-import-python-gif-builder",
            tool: "python",
            scope: "dep",
            permission: "import",
            args: ["core.gif_builder"],
            metadata: { language: "python", discoveryMethod: "import" },
            references: [{ file: "SKILL.md", line: 24, type: "script" }],
            source: "inferred",
            risks: [],
        },
        {
            id: "dep-import-python-validators",
            tool: "python",
            scope: "dep",
            permission: "import",
            args: ["core.validators"],
            metadata: { language: "python", discoveryMethod: "import" },
            references: [{ file: "SKILL.md", line: 124, type: "script" }],
            source: "inferred",
            risks: [],
        },
    );

    const result = await run003Risks(state, { config: DEFAULT_ANALYZER_CONFIG });
    const importRisks = result.risks.filter((risk) => risk.type === "DEPENDENCY:external_import");

    assertEquals(importRisks.length, 2);
    assertEquals(
        importRisks.every((risk) => risk.groupKey === "DEPENDENCY:external_import:python"),
        true,
    );
});

Deno.test("run003Risks maps externalreference permission to warning risk", async () => {
    const state = createInitialState();
    state.permissions.push({
        id: "dep-ext-python-source",
        tool: "python",
        scope: "dep",
        permission: "externalreference",
        args: ["./lib/common.sh"],
        metadata: { discoveryMethod: "source" },
        references: [{ file: "SKILL.md", line: 253, type: "script" }],
        source: "inferred",
        risks: [],
    });

    const result = await run003Risks(state, { config: DEFAULT_ANALYZER_CONFIG });

    assertEquals(result.risks.length, 1);
    assertEquals(result.risks[0].type, "REFERENCE:external_file");
    assertEquals(result.risks[0].groupKey, "REFERENCE:external_file:python");
    assertEquals(result.risks[0].severity, "warning");
    assertEquals(result.risks[0].metadata?.discoveryMethod, "source");
});
