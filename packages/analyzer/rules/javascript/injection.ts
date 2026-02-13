import type { AstGrepRule } from "../../astgrep/client.ts";

export const JAVASCRIPT_INJECTION_RULES: AstGrepRule[] = [
    {
        id: "inject-eval",
        description: "Detects eval-style execution",
        language: "javascript",
        patterns: ["eval($CODE)", "new Function($CODE)", "exec($CODE)"],
        permission: {
            tool: "eval",
            scope: "sys",
            permission: "shell",
            metadata: { code: "CODE" },
            mappedRisks: [{
                code: "INJECTION:command_injection",
                severity: "critical",
                message: "Dynamic code execution detected",
            }],
        },
    },
];
