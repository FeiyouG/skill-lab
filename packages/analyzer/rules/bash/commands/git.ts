import type { AstGrepRule } from "../../../astgrep/client.ts";

export const GIT_RULES: AstGrepRule[] = [
    {
        id: "shell-git",
        description: "Detects git commands",
        grammar: "bash",
        patterns: [
            "git status",
            "git add $PATH",
            "git commit $$$ARGS",
            "git pull $$$ARGS",
            "git push $$$ARGS",
            "git checkout $BRANCH",
            "git merge $BRANCH",
            "git rebase $BRANCH",
            "git clone $URL",
            "git fetch $$$ARGS",
            "git log $$$ARGS",
        ],
        permission: {
            tool: "git",
            scope: "sys",
            permission: "shell",
            metadata: { url: "URL", branch: "BRANCH", path: "PATH" },
        },
    },
];
