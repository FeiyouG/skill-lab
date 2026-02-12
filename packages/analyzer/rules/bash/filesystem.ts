import type { AstGrepRule } from "../../astgrep/client.ts";

export const BASH_FILESYSTEM_RULES: AstGrepRule[] = [
    {
        id: "fs-read-cat",
        description: "Detects cat file reads",
        language: "bash",
        patterns: ["cat $FILE", "less $FILE", "head $FILE", "tail $FILE"],
        permission: {
            tool: "cat",
            scope: "fs",
            permission: "read",
            metadata: { file: "FILE" },
        },
    },
    {
        id: "fs-rm-rf",
        description: "Detects recursive delete",
        language: "bash",
        patterns: ["rm -rf $PATH", "rm -fr $PATH"],
        permission: {
            tool: "rm",
            scope: "fs",
            permission: "write",
            metadata: { path: "PATH" },
        },
    },
    {
        id: "fs-chmod-777",
        description: "Detects permissive chmod",
        language: "bash",
        patterns: ["chmod 777 $PATH", "chmod -R 777 $PATH"],
        permission: {
            tool: "chmod",
            scope: "fs",
            permission: "write",
            metadata: { path: "PATH" },
        },
    },
];
