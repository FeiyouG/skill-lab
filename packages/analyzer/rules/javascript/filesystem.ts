import type { AstGrepRule } from "../../astgrep/client.ts";

export const JAVASCRIPT_FILESYSTEM_RULES: AstGrepRule[] = [
    {
        id: "fs-read-js",
        description: "Detects JS file reads",
        grammar: "javascript",
        patterns: ["Deno.readTextFile($FILE)", "Deno.readFile($FILE)", "readFileSync($FILE)"],
        permission: {
            tool: "read",
            scope: "fs",
            permission: "read",
            metadata: { file: "FILE" },
        },
    },
    {
        id: "fs-write-js",
        description: "Detects JS file writes",
        grammar: "javascript",
        patterns: ["Deno.writeTextFile($FILE, $CONTENT)", "Deno.writeFile($FILE, $CONTENT)"],
        permission: {
            tool: "write",
            scope: "fs",
            permission: "write",
            metadata: { file: "FILE" },
        },
    },
];
