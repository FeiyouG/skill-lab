import type { AstGrepRule } from "../../../astgrep/client.ts";

export const DOCKER_RULES: AstGrepRule[] = [
    {
        id: "shell-docker",
        description: "Detects docker commands",
        grammar: "bash",
        patterns: [
            "docker run $$$ARGS",
            "docker exec $$$ARGS",
            "docker build $$$ARGS",
            "docker pull $$$ARGS",
            "docker push $$$ARGS",
        ],
        permission: {
            tool: "docker",
            scope: "sys",
            permission: "shell",
        },
    },
    {
        id: "shell-docker-compose",
        description: "Detects docker compose commands",
        grammar: "bash",
        patterns: [
            "docker-compose up $$$ARGS",
            "docker-compose down $$$ARGS",
            "docker compose up $$$ARGS",
            "docker compose down $$$ARGS",
        ],
        permission: {
            tool: "docker-compose",
            scope: "sys",
            permission: "shell",
        },
    },
];
