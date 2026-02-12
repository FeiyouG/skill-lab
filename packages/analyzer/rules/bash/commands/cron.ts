import type { AstGrepRule } from "../../../astgrep/client.ts";

export const CRON_RULES: AstGrepRule[] = [
    {
        id: "shell-cron",
        description: "Detects cron persistence",
        language: "bash",
        patterns: ["crontab $FILE", "echo $ENTRY | crontab -"],
        permission: {
            tool: "crontab",
            scope: "sys",
            permission: "shell",
            metadata: { file: "FILE" },
        },
    },
];
