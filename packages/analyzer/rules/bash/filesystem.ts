import type { AstGrepRule } from "../../astgrep/client.ts";

export const BASH_FILESYSTEM_RULES: AstGrepRule[] = [
    {
        id: "fs-read-cat",
        description: "Detects cat file reads",
        grammar: "bash",
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
        grammar: "bash",
        patterns: ["rm -rf $PATH", "rm -fr $PATH"],
        permission: {
            tool: "rm",
            scope: "fs",
            permission: "write",
            metadata: { path: "PATH" },
            mappedRisks: [{
                code: "DESTRUCTIVE:destructive_behavior",
                severity: "critical",
                message: "Recursive delete detected",
            }],
        },
    },
    {
        id: "fs-chmod-777",
        description: "Detects permissive chmod",
        grammar: "bash",
        patterns: ["chmod 777 $PATH", "chmod -R 777 $PATH"],
        permission: {
            tool: "chmod",
            scope: "fs",
            permission: "write",
            metadata: { path: "PATH" },
            mappedRisks: [{
                code: "DESTRUCTIVE:permission_weakening",
                severity: "warning",
                message: "Overly permissive chmod detected",
            }],
        },
    },
];
