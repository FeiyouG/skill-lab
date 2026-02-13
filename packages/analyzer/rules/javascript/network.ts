import type { AstGrepRule } from "../../astgrep/client.ts";
import { DETECT_NETWORK_FETCH_RISKS } from "../shared/network-evaluators.ts";

export const JAVASCRIPT_NETWORK_RULES: AstGrepRule[] = [
    {
        id: "net-fetch",
        description: "Detects fetch() calls",
        grammar: "javascript",
        patterns: [
            "fetch($URL)",
            "fetch($URL, { method: $METHOD })",
            "fetch($URL, { headers: $HEADERS })",
            "fetch($URL, { method: $METHOD, headers: $HEADERS })",
        ],
        permission: {
            tool: "fetch",
            scope: "net",
            permission: "fetch",
            metadata: {
                url: "URL",
                method: "METHOD",
                headers: "HEADERS",
            },
            mappedRisks: [DETECT_NETWORK_FETCH_RISKS],
        },
    },
];
