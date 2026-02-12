import type { AstGrepRule } from "../../../astgrep/client.ts";

export const OPENSPEC_RULES: AstGrepRule[] = [
    {
        id: "shell-openspec",
        description: "Detects openspec commands",
        language: "bash",
        patterns: ["openspec $SUB $$$ARGS"],
        permission: {
            tool: "openspec",
            scope: "sys",
            permission: "shell",
            metadata: { subcommand: "SUB" },
        },
    },
];
