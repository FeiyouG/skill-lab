import type { AstGrepRule } from "../../astgrep/client.ts";

export const BASH_COMMAND_RULES: AstGrepRule[] = [
    {
        id: "shell-gh",
        description: "Detects gh commands",
        language: "bash",
        patterns: ["gh pr", "gh issue", "gh repo", "gh api", "gh auth"],
        permission: {
            tool: "gh",
            scope: "sys",
            permission: "shell",
        },
    },
    {
        id: "shell-git",
        description: "Detects git commands",
        language: "bash",
        patterns: [
            "git status",
            "git add",
            "git commit",
            "git pull",
            "git push",
            "git checkout",
            "git merge",
            "git rebase",
            "git clone $URL",
        ],
        permission: {
            tool: "git",
            scope: "sys",
            permission: "shell",
            metadata: { url: "URL" },
        },
    },
    {
        id: "shell-openspec",
        description: "Detects openspec commands",
        language: "bash",
        patterns: ["openspec $SUB"],
        permission: {
            tool: "openspec",
            scope: "sys",
            permission: "shell",
            metadata: { subcommand: "SUB" },
        },
    },
    {
        id: "shell-bd",
        description: "Detects bd task commands",
        language: "bash",
        patterns: ["bd ready", "bd show $ID", "bd update $ID", "bd close $ID", "bd sync"],
        permission: {
            tool: "bd",
            scope: "sys",
            permission: "shell",
            metadata: { id: "ID" },
        },
    },
    {
        id: "shell-package-managers",
        description: "Detects package manager commands",
        language: "bash",
        patterns: ["npm $SUB", "pnpm $SUB", "yarn $SUB"],
        permission: {
            tool: "package-manager",
            scope: "sys",
            permission: "shell",
            metadata: { subcommand: "SUB" },
        },
    },
    {
        id: "shell-sudo",
        description: "Detects sudo usage",
        language: "bash",
        patterns: ["sudo $CMD $$$ARGS"],
        permission: {
            tool: "sudo",
            scope: "sys",
            permission: "sudo",
            metadata: { command: "CMD" },
        },
    },
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
