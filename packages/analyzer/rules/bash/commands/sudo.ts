import type { AstGrepRule } from "../../../astgrep/client.ts";

export const SUDO_RULES: AstGrepRule[] = [
    {
        id: "shell-sudo",
        description: "Detects sudo usage",
        language: "bash",
        patterns: ["sudo $CMD $$$ARGS"],
        permission: {
            tool: "sudo",
            scope: "sys",
            permission: "sudo",
            metadata: { command: "CMD" },
        },
    },
];
