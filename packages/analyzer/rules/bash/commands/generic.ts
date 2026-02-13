import type { AstGrepRule } from "../../../astgrep/client.ts";

export const GENERIC_SHELL_RULES: AstGrepRule[] = [
    {
        id: "shell-generic-command",
        description: "Catches unrecognized shell command invocations",
        grammar: "bash",
        patterns: ["$TOOL $$$ARGS"],
        permission: {
            tool: "detected",
            scope: "sys",
            permission: "shell",
            metadata: { tool: "TOOL", args: "ARGS" },
        },
    },
];
