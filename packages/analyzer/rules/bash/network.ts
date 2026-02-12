import type { AstGrepRule } from "../../astgrep/client.ts";

export const BASH_NETWORK_RULES: AstGrepRule[] = [
    {
        id: "net-curl",
        description: "Detects curl usage",
        language: "bash",
        patterns: [
            "curl $URL",
            "curl -X $METHOD $URL",
            "curl --request $METHOD $URL",
            "curl $$$FLAGS -H $HEADER $$$REST",
            "curl $$$FLAGS --header $HEADER $$$REST",
            "curl $$$FLAGS $URL?token=$TOKEN",
        ],
        permission: {
            tool: "curl",
            scope: "net",
            permission: "fetch",
            metadata: {
                method: "METHOD",
                url: "URL",
                header: "HEADER",
                token: "TOKEN",
            },
        },
    },
    {
        id: "net-wget",
        description: "Detects wget usage",
        language: "bash",
        patterns: ["wget $URL", "wget --post-data=$DATA $URL"],
        permission: {
            tool: "wget",
            scope: "net",
            permission: "fetch",
            metadata: {
                url: "URL",
                data: "DATA",
            },
        },
    },
    {
        id: "net-pipe-shell",
        description: "Detects network pipe to shell",
        language: "bash",
        patterns: ["curl $$$ARGS | bash", "curl $$$ARGS | sh", "wget $$$ARGS | bash"],
        permission: {
            tool: "bash",
            scope: "sys",
            permission: "shell",
            metadata: {
                command: "ARGS",
            },
        },
    },
];
