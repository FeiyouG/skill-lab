import type { AstGrepRule } from "../../../astgrep/client.ts";

export const PIP_RULES: AstGrepRule[] = [
    {
        id: "shell-pip",
        description: "Detects pip commands",
        grammar: "bash",
        patterns: ["pip $SUB $$$ARGS", "pip3 $SUB $$$ARGS"],
        permission: {
            tool: "pip",
            scope: "sys",
            permission: "shell",
            metadata: { subcommand: "SUB" },
        },
    },
];
