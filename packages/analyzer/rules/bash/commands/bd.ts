import type { AstGrepRule } from "../../../astgrep/client.ts";

export const BD_RULES: AstGrepRule[] = [
    {
        id: "shell-bd",
        description: "Detects bd task commands",
        language: "bash",
        patterns: [
            "bd ready",
            "bd show $ID",
            "bd update $ID $$$ARGS",
            "bd close $ID",
            "bd sync",
            "bd create $$$ARGS",
        ],
        permission: {
            tool: "bd",
            scope: "sys",
            permission: "shell",
            metadata: { id: "ID" },
        },
    },
];
