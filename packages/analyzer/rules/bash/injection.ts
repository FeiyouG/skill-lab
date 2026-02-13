import type { AstGrepRule } from "../../astgrep/client.ts";

export const BASH_INJECTION_RULES: AstGrepRule[] = [
    {
        id: "inject-substitution",
        description: "Detects shell command substitution",
        language: "bash",
        patterns: ["$($CMD)", "`$CMD`"],
        permission: {
            tool: "bash",
            scope: "sys",
            permission: "shell",
            metadata: { command: "CMD" },
            mappedRisks: [{
                code: "INJECTION:command_injection",
                severity: "warning",
                message: "Command substitution can enable injection",
            }],
        },
    },
];
