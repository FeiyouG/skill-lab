import type { AstGrepRule } from "../../../astgrep/client.ts";

export const GH_RULES: AstGrepRule[] = [
    {
        id: "shell-gh",
        description: "Detects GitHub CLI commands",
        language: "bash",
        patterns: [
            "gh pr $$$ARGS",
            "gh issue $$$ARGS",
            "gh repo $$$ARGS",
            "gh api $$$ARGS",
            "gh auth $$$ARGS",
        ],
        permission: {
            tool: "gh",
            scope: "sys",
            permission: "shell",
        },
    },
];
