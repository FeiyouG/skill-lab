import type { AstGrepRule } from "../../astgrep/client.ts";

export const BASH_DESTRUCTIVE_RULES: AstGrepRule[] = [
    {
        id: "destructive-format",
        description: "Detects disk format commands",
        grammar: "bash",
        patterns: ["mkfs $DEVICE", "format $DEVICE"],
        permission: {
            tool: "format",
            scope: "fs",
            permission: "write",
            metadata: { device: "DEVICE" },
        },
    },
    {
        id: "destructive-config-write",
        description: "Detects config file overwrite",
        grammar: "bash",
        patterns: ["echo $VALUE > $FILE"],
        permission: {
            tool: "write",
            scope: "fs",
            permission: "write",
            metadata: { file: "FILE" },
        },
    },
];
