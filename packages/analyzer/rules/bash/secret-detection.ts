import type { AstGrepRule } from "../../astgrep/client.ts";

export const BASH_SECRET_DETECTION_RULES: AstGrepRule[] = [
    {
        id: "secret-bash-env-read-plain",
        description: "Detects bash env var read with $VAR",
        language: "bash",
        patterns: ["echo $$VAR", "printf $$VAR"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "read",
            metadata: { key: "VAR" },
        },
    },
    {
        id: "secret-bash-env-read-braced",
        description: "Detects bash env var read with ${VAR}",
        language: "bash",
        patterns: ["echo ${$VAR}", "printf ${$VAR}"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "read",
            metadata: { key: "VAR" },
        },
    },
    {
        id: "secret-bash-env-write",
        description: "Detects export env var write",
        language: "bash",
        patterns: ["export $KEY=$VALUE"],
        permission: {
            tool: "env",
            scope: "env",
            permission: "write",
            metadata: { key: "KEY" },
        },
    },
];
