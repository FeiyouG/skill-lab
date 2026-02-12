import type { AstGrepRule } from "../../astgrep/client.ts";

export const JAVASCRIPT_SUBPROCESS_RULES: AstGrepRule[] = [
    {
        id: "shell-subprocess-js",
        description: "Detects JS subprocess execution",
        language: "javascript",
        patterns: ["Deno.Command($CMD)", "spawn($CMD)", "exec($CMD)"],
        permission: {
            tool: "subprocess",
            scope: "sys",
            permission: "subprocess",
            metadata: { command: "CMD" },
        },
    },
];
