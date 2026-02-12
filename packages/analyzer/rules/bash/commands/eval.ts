import type { AstGrepRule } from "../../../astgrep/client.ts";

export const EVAL_RULES: AstGrepRule[] = [
    {
        id: "shell-eval",
        description: "Detects eval execution",
        language: "bash",
        patterns: ["eval $CMD", 'eval "$CMD"', "eval '$CMD'"],
        permission: {
            tool: "eval",
            scope: "sys",
            permission: "shell",
            metadata: { command: "CMD" },
        },
    },
    {
        id: "shell-sh-c",
        description: "Detects sh -c execution",
        language: "bash",
        patterns: ["sh -c $CMD", 'sh -c "$CMD"', "sh -c '$CMD'"],
        permission: {
            tool: "sh",
            scope: "sys",
            permission: "shell",
            metadata: { command: "CMD" },
        },
    },
    {
        id: "shell-bash-c",
        description: "Detects bash -c execution",
        language: "bash",
        patterns: ["bash -c $CMD", 'bash -c "$CMD"', "bash -c '$CMD'"],
        permission: {
            tool: "bash",
            scope: "sys",
            permission: "shell",
            metadata: { command: "CMD" },
        },
    },
    {
        id: "shell-source",
        description: "Detects source command",
        language: "bash",
        patterns: ["source $FILE", ". $FILE"],
        permission: {
            tool: "source",
            scope: "fs",
            permission: "read",
            metadata: { file: "FILE" },
        },
    },
];
