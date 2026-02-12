import type { AstGrepRule } from "../../../astgrep/client.ts";

export const NODE_ECOSYSTEM_RULES: AstGrepRule[] = [
    {
        id: "shell-npm",
        description: "Detects npm commands",
        language: "bash",
        patterns: ["npm $SUB $$$ARGS"],
        permission: {
            tool: "npm",
            scope: "sys",
            permission: "shell",
            metadata: { subcommand: "SUB" },
        },
    },
    {
        id: "shell-pnpm",
        description: "Detects pnpm commands",
        language: "bash",
        patterns: ["pnpm $SUB $$$ARGS"],
        permission: {
            tool: "pnpm",
            scope: "sys",
            permission: "shell",
            metadata: { subcommand: "SUB" },
        },
    },
    {
        id: "shell-yarn",
        description: "Detects yarn commands",
        language: "bash",
        patterns: ["yarn $SUB $$$ARGS"],
        permission: {
            tool: "yarn",
            scope: "sys",
            permission: "shell",
            metadata: { subcommand: "SUB" },
        },
    },
    {
        id: "shell-deno",
        description: "Detects deno commands",
        language: "bash",
        patterns: ["deno $SUB $$$ARGS"],
        permission: {
            tool: "deno",
            scope: "sys",
            permission: "shell",
            metadata: { subcommand: "SUB" },
        },
    },
    {
        id: "shell-node",
        description: "Detects node commands",
        language: "bash",
        patterns: ["node $FILE $$$ARGS"],
        permission: {
            tool: "node",
            scope: "sys",
            permission: "shell",
            metadata: { file: "FILE" },
        },
    },
];
