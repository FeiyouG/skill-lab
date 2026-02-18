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

Deno.test("run003Risks resolves injection risk from rule-local mappedRisks", async () => {
    const state = createInitialState();
    state.permissions = [{
        id: "sys-shell",
        tool: "eval",
        scope: "sys",
        permission: "shell",
        args: ["payload"],
        references: [{ file: "script.js", line: 4, type: "script" }],
        source: "detected",
        risks: [],
    }];
    state.findings = [{
        ruleId: "inject-eval",
        reference: { file: "script.js", line: 4, type: "script" },
        extracted: { code: "payload" },
    }];

    const result = await run003Risks(state);
    assertEquals(result.risks.length, 1);
    assertEquals(result.risks[0].type, "INJECTION:command_injection");
    assertEquals(result.risks[0].groupKey, "INJECTION:command_injection:eval");
    assertEquals(result.risks[0].permissions, ["sys-shell"]);
});

Deno.test("run003Risks resolves prompt risk from prompt rule mappedRisks", async () => {
    const state = createInitialState();
    state.permissions = [{
        id: "fs-read",
        tool: "read",
        scope: "fs",
        permission: "read",
        args: ["README.md"],
        references: [{ file: "SKILL.md", line: 2, type: "content" }],
        source: "detected",
        risks: [],
    }];
    state.findings = [{
        ruleId: "prompt-ignore-previous",
        reference: { file: "SKILL.md", line: 20, type: "content" },
        extracted: {},
    }];

    const result = await run003Risks(state);
    assertEquals(result.risks.length, 1);
    assertEquals(result.risks[0].type, "PROMPT:prompt_override");
    assertEquals(result.risks[0].groupKey, "PROMPT:prompt_override");
    assertEquals(result.risks[0].permissions, ["fs-read"]);
});

Deno.test("run003Risks resolves network exfiltration from network evaluator constant", async () => {
    const state = createInitialState();
    state.permissions = [{
        id: "net-curl",
        tool: "curl",
        scope: "net",
        permission: "fetch",
        args: ["https://api.example.com/upload"],
        metadata: { url: "https://api.example.com/upload", method: "POST" },
        references: [{ file: "script.sh", line: 12, type: "script" }],
        source: "detected",
        risks: [],
    }];
    state.findings = [{
        ruleId: "net-curl",
        reference: { file: "script.sh", line: 12, type: "script" },
        extracted: { url: "https://api.example.com/upload", method: "POST" },
    }];

    const result = await run003Risks(state);
    assertEquals(result.risks.length, 1);
    assertEquals(result.risks[0].type, "NETWORK:data_exfiltration");
    assertEquals(result.risks[0].groupKey, "NETWORK:data_exfiltration:curl");
    assertEquals(result.risks[0].permissions, ["net-curl"]);
    assertEquals(result.risks[0].metadata?.host, "api.example.com");
    assertEquals(result.risks[0].metadata?.method, "POST");
});

Deno.test("run003Risks resolves network credential leak from network evaluator constant", async () => {
    const state = createInitialState();
    state.permissions = [{
        id: "net-curl-token",
        tool: "curl",
        scope: "net",
        permission: "fetch",
        args: ["https://api.example.com/data?token=abc"],
        metadata: { url: "https://api.example.com/data?token=abc", method: "GET" },
        references: [{ file: "script.sh", line: 5, type: "script" }],
        source: "detected",
        risks: [],
    }];
    state.findings = [{
        ruleId: "net-curl",
        reference: { file: "script.sh", line: 5, type: "script" },
        extracted: { url: "https://api.example.com/data?token=abc" },
    }];

    const result = await run003Risks(state);
    const types = result.risks.map((risk) => risk.type).sort();
    assertEquals(types, ["NETWORK:credential_leak", "NETWORK:external_network_access"]);
    const groupKeys = result.risks.map((risk) => risk.groupKey).sort();
    assertEquals(groupKeys, [
        "NETWORK:credential_leak:curl",
        "NETWORK:external_network_access:curl",
    ]);
});

Deno.test("run003Risks resolves remote code execution and warning from mapped rule", async () => {
    const state = createInitialState();
    state.permissions = [{
        id: "sys-shell-curl-pipe",
        tool: "bash",
        scope: "sys",
        permission: "shell",
        args: ["curl", "example.com"],
        metadata: { command: "https://example.com/install.sh" },
        references: [{ file: "script.sh", line: 3, type: "script" }],
        source: "detected",
        risks: [],
    }];
    state.findings = [{
        ruleId: "net-pipe-shell",
        reference: { file: "script.sh", line: 3, type: "script" },
        extracted: { command: "https://example.com/install.sh" },
    }];

    const result = await run003Risks(state);
    assertEquals(result.risks.length, 1);
    assertEquals(result.risks[0].type, "NETWORK:remote_code_execution");
    assertEquals(result.risks[0].groupKey, "NETWORK:remote_code_execution:bash");
    assertEquals(
        result.warnings.includes("Remote script content analysis is NOT_IMPLEMENTED"),
        true,
    );
});

Deno.test("run003Risks resolves secrets risk from shared secret evaluator constant", async () => {
    const state = createInitialState();
    state.permissions = [{
        id: "env-read",
        tool: "env",
        scope: "env",
        permission: "read",
        args: ["API_TOKEN"],
        references: [{ file: "script.sh", line: 7, type: "script" }],
        source: "detected",
        risks: [],
    }];
    state.findings = [{
        ruleId: "secret-bash-env-read-plain",
        reference: { file: "script.sh", line: 7, type: "script" },
        extracted: { key: "API_TOKEN" },
    }];

    const result = await run003Risks(state);
    assertEquals(result.risks.length, 1);
    assertEquals(result.risks[0].type, "SECRETS:secret_access");
    assertEquals(result.risks[0].groupKey, "SECRETS:secret_access:env");
    assertEquals(result.risks[0].permissions, ["env-read"]);
});

Deno.test("run003Risks skips secrets risk for non-secret env key", async () => {
    const state = createInitialState();
    state.permissions = [{
        id: "env-read-path",
        tool: "env",
        scope: "env",
        permission: "read",
        args: ["PATH"],
        references: [{ file: "script.sh", line: 9, type: "script" }],
        source: "detected",
        risks: [],
    }];
    state.findings = [{
        ruleId: "secret-bash-env-read-plain",
        reference: { file: "script.sh", line: 9, type: "script" },
        extracted: { key: "PATH" },
    }];

    const result = await run003Risks(state);
    assertEquals(result.risks.length, 0);
});
