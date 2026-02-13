import type { AstGrepRule } from "../../astgrep/client.ts";
import { DETECT_NETWORK_FETCH_RISKS } from "../shared/network-evaluators.ts";

export const PYTHON_NETWORK_RULES: AstGrepRule[] = [
    {
        id: "net-requests",
        description: "Detects Python requests usage",
        language: "python",
        patterns: [
            "requests.get($URL)",
            "requests.post($URL, data=$DATA)",
            "requests.put($URL, data=$DATA)",
            "requests.patch($URL, data=$DATA)",
        ],
        permission: {
            tool: "requests",
            scope: "net",
            permission: "fetch",
            metadata: {
                url: "URL",
                data: "DATA",
            },
            mappedRisks: [DETECT_NETWORK_FETCH_RISKS],
        },
    },
];
