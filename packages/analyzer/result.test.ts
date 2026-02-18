import { assertEquals, assertStringIncludes } from "@std/assert";
import type { AnalyzerState } from "./types.ts";
import { SkillAnalyzerResult } from "./result.ts";

function baseState(overrides: Partial<AnalyzerState> = {}): AnalyzerState {
    return {
        skillId: "demo-skill",
        skillVersionId: "1.2.3",
        files: [],
        frontmatter: {},
        scanQueue: [],
        permissions: [],
        findings: [],
        risks: [],
        warnings: [],
        metadata: {
            scannedFiles: ["SKILL.md", "scripts/run.sh"],
            skippedFiles: [],
            rulesUsed: [],
            config: { maxFileSize: 1_000_000, maxFileCount: 100, maxScanDepth: 3 },
        },
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Basic accessors
// ---------------------------------------------------------------------------

Deno.test("SkillAnalyzerResult - exposes state fields", () => {
    const result = new SkillAnalyzerResult(baseState());
    assertEquals(result.skillId, "demo-skill");
    assertEquals(result.skillVersionId, "1.2.3");
    assertEquals(result.warnings, []);
    assertEquals(typeof result.analyzedAt, "string");
    assertEquals(result.analyzedAt.includes("T"), true);
});

Deno.test("SkillAnalyzerResult - scores safe when no risks or permissions", () => {
    const result = new SkillAnalyzerResult(baseState());
    assertEquals(result.riskLevel, "safe");
    assertEquals(result.score, 0);
});

// ---------------------------------------------------------------------------
// toString()
// ---------------------------------------------------------------------------

Deno.test("SkillAnalyzerResult.toString - renders empty sections with none", () => {
    const out = new SkillAnalyzerResult(baseState()).toString();
    assertStringIncludes(out, "Analysis Results");
    assertStringIncludes(out, "Skill: demo-skill@1.2.3");
    assertStringIncludes(out, "Permissions (0)");
    assertStringIncludes(out, "    - none");
    assertStringIncludes(out, "Risks (0)");
    assertStringIncludes(out, "Warnings (0)");
    assertStringIncludes(out, "Risk Level: safe");
});

Deno.test("SkillAnalyzerResult.toString - renders populated sections", () => {
    const state = baseState({
        permissions: [{
            id: "perm-1",
            tool: "read",
            scope: "fs",
            permission: "read",
            args: ["SKILL.md"],
            references: [{ file: "SKILL.md", line: 5, type: "frontmatter" }],
            source: "detected",
            risks: [],
        }],
        risks: [{
            id: "risk-1",
            type: "NETWORK:external_network_access",
            severity: "warning",
            message: "Outbound HTTP call",
            reference: { file: "scripts/run.sh", line: 8, type: "script" },
            permissions: ["perm-1"],
        }],
        warnings: ["External ref not analyzed: https://example.com"],
    });

    const out = new SkillAnalyzerResult(state).toString();
    assertStringIncludes(out, "Permissions (1)");
    assertStringIncludes(out, "- read.read [fs]");
    assertStringIncludes(out, "args: SKILL.md");
    assertStringIncludes(out, "source: detected");
    assertStringIncludes(out, "ref: SKILL.md:5 (frontmatter)");
    assertStringIncludes(out, "Risks (1)");
    assertStringIncludes(out, "- warning NETWORK:external_network_access");
    assertStringIncludes(out, "message: Outbound HTTP call");
    assertStringIncludes(out, "ref: scripts/run.sh:8 (script)");
    assertStringIncludes(out, "permissions: perm-1");
    assertStringIncludes(out, "Warnings (1)");
    assertStringIncludes(out, "- External ref not analyzed: https://example.com");
});

// ---------------------------------------------------------------------------
// toJson()
// ---------------------------------------------------------------------------

Deno.test("SkillAnalyzerResult.toJson - produces valid JSON with expected fields", () => {
    const result = new SkillAnalyzerResult(baseState());
    const parsed = JSON.parse(result.toJson());
    assertEquals(parsed.skillId, "demo-skill");
    assertEquals(parsed.skillVersionId, "1.2.3");
    assertEquals(parsed.riskLevel, "safe");
    assertEquals(parsed.score, 0);
    assertEquals(Array.isArray(parsed.permissions), true);
    assertEquals(Array.isArray(parsed.risks), true);
    assertEquals(Array.isArray(parsed.warnings), true);
    assertEquals(typeof parsed.analyzedAt, "string");
});

// ---------------------------------------------------------------------------
// toSarif()
// ---------------------------------------------------------------------------

Deno.test("SkillAnalyzerResult.toSarif - produces valid SARIF 2.1.0 structure", async () => {
    const result = new SkillAnalyzerResult(baseState());
    const sarif = JSON.parse(await result.toSarif("0.1.0"));
    assertEquals(sarif.version, "2.1.0");
    assertEquals(sarif.$schema, "https://json.schemastore.org/sarif-2.1.0.json");
    assertEquals(sarif.runs.length, 1);
    assertEquals(sarif.runs[0].tool.driver.name, "slab");
    assertEquals(sarif.runs[0].tool.driver.version, "0.1.0");
    assertEquals(Array.isArray(sarif.runs[0].results), true);
    assertEquals(Array.isArray(sarif.runs[0].artifacts), true);
});

Deno.test("SkillAnalyzerResult.toSarif - maps risk severity to SARIF levels", async () => {
    const state = baseState({
        risks: [
            {
                id: "r1",
                type: "INJECTION:command_injection",
                severity: "critical",
                message: "Command injection detected",
                reference: { file: "scripts/run.sh", line: 3, type: "script" },
                permissions: [],
            },
            {
                id: "r2",
                type: "NETWORK:external_network_access",
                severity: "warning",
                message: "Outbound call",
                reference: { file: "scripts/run.sh", line: 10, type: "script" },
                permissions: [],
            },
            {
                id: "r3",
                type: "SECRETS:secret_access",
                severity: "info",
                message: "Secret read",
                reference: { file: "scripts/run.sh", line: 20, type: "script" },
                permissions: [],
            },
        ],
    });

    const sarif = JSON.parse(await new SkillAnalyzerResult(state).toSarif("0.1.0"));
    const results = sarif.runs[0].results as Array<{ level: string; ruleId: string }>;
    assertEquals(results.find((r) => r.ruleId === "INJECTION:command_injection")?.level, "error");
    assertEquals(
        results.find((r) => r.ruleId === "NETWORK:external_network_access")?.level,
        "warning",
    );
    assertEquals(results.find((r) => r.ruleId === "SECRETS:secret_access")?.level, "note");
});

Deno.test("SkillAnalyzerResult.toSarif - warnings appear as slab/warning note results", async () => {
    const state = baseState({ warnings: ["Something was skipped"] });
    const sarif = JSON.parse(await new SkillAnalyzerResult(state).toSarif("0.1.0"));
    const results = sarif.runs[0].results as Array<{ ruleId: string; level: string }>;
    const warnResult = results.find((r) => r.ruleId === "slab/warning");
    assertEquals(warnResult?.level, "note");

    const rules = sarif.runs[0].tool.driver.rules as Array<{ id: string }>;
    assertEquals(rules.some((r) => r.id === "slab/warning"), true);
});

Deno.test("SkillAnalyzerResult.toSarif - permissions appear in rules only, not results", async () => {
    const state = baseState({
        permissions: [{
            id: "perm-1",
            tool: "read",
            scope: "fs",
            permission: "read",
            references: [{ file: "SKILL.md", line: 1, type: "frontmatter" }],
            source: "detected",
            risks: [],
        }],
    });

    const sarif = JSON.parse(await new SkillAnalyzerResult(state).toSarif("0.1.0"));
    const rules = sarif.runs[0].tool.driver.rules as Array<{ id: string }>;
    const results = sarif.runs[0].results as Array<{ ruleId: string }>;

    assertEquals(rules.some((r) => r.id === "perm-1"), true);
    assertEquals(results.some((r) => r.ruleId === "perm-1"), false);
});

Deno.test("SkillAnalyzerResult.toSarif - fingerprints are stable", async () => {
    const state = baseState({
        risks: [{
            id: "r1",
            type: "INJECTION:command_injection",
            severity: "critical",
            message: "msg",
            reference: { file: "f.sh", line: 5, type: "script" },
            permissions: [],
        }],
    });

    const run1 = JSON.parse(await new SkillAnalyzerResult(state).toSarif("0.1.0"));
    const run2 = JSON.parse(await new SkillAnalyzerResult(state).toSarif("0.1.0"));
    const fp1 = run1.runs[0].results[0].fingerprints["slab/v1"];
    const fp2 = run2.runs[0].results[0].fingerprints["slab/v1"];
    assertEquals(fp1, fp2);
    assertEquals(typeof fp1, "string");
    assertEquals(fp1.length, 64); // SHA-256 hex
});

Deno.test("SkillAnalyzerResult.toSarif - artifacts list scanned files", async () => {
    const result = new SkillAnalyzerResult(baseState());
    const sarif = JSON.parse(await result.toSarif("0.1.0"));
    const artifacts = sarif.runs[0].artifacts as Array<{ location: { uri: string } }>;
    assertEquals(artifacts.length, 2);
    assertEquals(artifacts[0].location.uri, "SKILL.md");
    assertEquals(artifacts[1].location.uri, "scripts/run.sh");
});
